<script def>
{
  "navigationBarTitleText": "深度搜题 (Agent)"
}
</script>

<script setup>
import wx from 'wx';
import { LanguageModel } from 'language-model';
import { API_MODELS } from '../../config.js';
import { drawMathAst, buildBlocks, buildStreamingBlocks } from '../../utils/latex-renderer.js';
import { isNoQuestion, extractAnswerText, hasVisibleContent } from '../../utils/prompts.js';
import { captureCameraPhoto } from '../../utils/camera-helper.js';
import { runAgentApiPipeline, runAgentBuiltinPipeline, formatSingleLinePreview } from '../../services/pipeline-engine.js';

const MODES = (() => {
  const list = [];
  for (let k = 0; k < API_MODELS.length; k++) {
    list.push({ provider: 'api', model: API_MODELS[k], label: API_MODELS[k] });
  }
  list.push({ provider: 'builtin', model: '', label: '内置模型' });
  return list;
})();

export default {
  data: {
    phase: 'capture',
    countdown: 3,
    photoSrc: '',
    stageStep: '1/3',
    isStage1: true,
    totalQuestions: 1,
    reasoningText: '',
    progress: 0,
    hasTasks: false,
    questionTasks: [],
    answerBlocks: [],
    scrollTop: 0,
    errorText: '',
    provider: 'api',
    providerInfo: API_MODELS[0] || 'gemini-3.7-flash'
  },

  onLoad() {
    try {
      wx.setBackgroundColor({
        backgroundColor: '#000000',
        backgroundColorTop: '#000000',
        backgroundColorBottom: '#000000'
      });
    } catch (e) {}
    this._timers = [];
    this._longPressTimer = null;
    this._arrowDownHandled = false;
    this._modeIndex = 0;
    this._apiModel = '';
    this.applyMode();
    this.startCaptureFlow();
  },

  onUnload() {
    this.clearTimers();
    if (this._longPressTimer !== null) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  },

  currentMode() {
    return MODES[this._modeIndex] || MODES[0];
  },

  applyMode() {
    const mode = this.currentMode();
    this._apiModel = mode.model;
    this.setData({
      provider: mode.provider,
      providerInfo: mode.label
    });
  },

  switchMode(dir) {
    this._modeIndex = (this._modeIndex + dir + MODES.length) % MODES.length;
    this.applyMode();
    this.clearTimers();
    this.startCaptureFlow();
  },

  onKeyDown(event) {
    const code = event.code;
    if (code === 'ArrowUp' || code === 'ArrowDown') {
      event.preventDefault();
      this._arrowDownHandled = true;
      this.handleArrow(code === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (code === 'Backspace' || code === 'Escape') {
      event.preventDefault();
      if (this.data.phase === 'answer' || this.data.phase === 'error' || this.data.phase === 'solving') {
        this.resetSearch();
      }
      return;
    }
    if (code !== 'Enter' && code !== 'GlobalHook') {
      return;
    }
    if (this.data.phase === 'answer' || this.data.phase === 'error' || this.data.phase === 'solving') {
      event.preventDefault();
      if (!this._pressStartTime) {
        this._pressStartTime = Date.now();
      }
      if (!this._longPressTimer) {
        this._longPressTimer = setTimeout(() => {
          this._longPressTimer = null;
          this._longPressTriggered = true;
          this.resetSearch();
        }, 400);
      }
      return;
    }
  },

  onKeyUp(event) {
    const code = event.code;
    if (code === 'Backspace' || code === 'Escape') {
      event.preventDefault();
      if (this.data.phase === 'answer' || this.data.phase === 'error' || this.data.phase === 'solving') {
        this.resetSearch();
      }
      return;
    }
    if (code === 'Enter' || code === 'GlobalHook') {
      event.preventDefault();
      const pressDuration = this._pressStartTime ? Date.now() - this._pressStartTime : 0;
      this._pressStartTime = 0;

      if (this._longPressTimer !== null) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }

      if (this._longPressTriggered) {
        this._longPressTriggered = false;
        return;
      }

      if (this.data.phase === 'error') {
        this.resetSearch();
        return;
      }

      if (this.data.phase === 'answer' || this.data.phase === 'solving') {
        const now = Date.now();
        const lastTap = this._lastTapTime || 0;
        this._lastTapTime = now;
        if (now - lastTap < 350 || pressDuration >= 400) {
          this.resetSearch();
          return;
        }
      }
      return;
    }
    if (code === 'ArrowUp' || code === 'ArrowDown') {
      event.preventDefault();
      if (this._arrowDownHandled) {
        this._arrowDownHandled = false;
        return;
      }
      this.handleArrow(code === 'ArrowUp' ? -1 : 1);
      return;
    }
  },

  handleArrow(dir) {
    if (this.data.phase === 'capture') {
      this.switchMode(dir);
      return;
    }
    if (this.data.phase === 'answer') {
      this.setData({
        scrollTop: Math.max(0, (this.data.scrollTop || 0) + dir * 160)
      });
    }
  },

  resetSearch() {
    this.clearTimers();
    this._longPressTriggered = false;
    this._pressStartTime = 0;
    this.setData({
      phase: 'capture',
      photoSrc: '',
      errorText: '',
      stageStep: '1/3',
      isStage1: true,
      totalQuestions: 1,
      reasoningText: '',
      answerBlocks: [],
      scrollTop: 0,
      countdown: 3,
      progress: 0,
      hasTasks: false,
      questionTasks: []
    });
    this.startCaptureFlow();
  },

  clearTimers() {
    const timers = this._timers || [];
    for (let k = 0; k < timers.length; k++) {
      clearInterval(timers[k]);
    }
    this._timers = [];
  },

  addTimer(ms, fn) {
    const timer = setInterval(fn, ms);
    this._timers.push(timer);
    return timer;
  },

  startCaptureFlow() {
    let count = 3;
    this.setData({ countdown: count, errorText: '', phase: 'capture' });
    this.addTimer(1000, () => {
      const next = this.data.countdown - 1;
      if (next <= 0) {
        this.clearTimers();
        this.capturePhoto();
        return;
      }
      this.setData({ countdown: next });
    });
  },

  async capturePhoto() {
    try {
      const dataUrl = await captureCameraPhoto(wx);
      this.showPhotoPreview(dataUrl);
    } catch (e) {
      this.fail((e && e.message) || '拍摄失败，请重试');
    }
  },

  showPhotoPreview(dataUrl) {
    this.clearTimers();
    this.setData({
      phase: 'preview',
      errorText: '',
      photoSrc: dataUrl
    });
    this.addTimer(1000, () => {
      this.clearTimers();
      this.solveQuestion(dataUrl);
    });
  },

  handleNoQuestion() {
    this.clearTimers();
    this.setData({
      phase: 'error',
      errorText: '未识别到问题'
    });
  },

  async solveQuestion(dataUrl) {
    this.setData({
      phase: 'solving',
      errorText: '',
      stageStep: '1/3',
      isStage1: true,
      totalQuestions: 1,
      reasoningText: '正在识别图像中的问题与需求…',
      hasTasks: false,
      questionTasks: []
    });
    this.startProgress();

    const callbacks = {
      onStageStep: (step, hint) => {
        this.setData({
          stageStep: step,
          isStage1: step === '1/3',
          reasoningText: hint || ''
        });
      },
      onStage1Progress: (partial) => {
        this.setData({
          hasTasks: true,
          questionTasks: partial.map((q, idx) => ({
            id: q.id || String(idx + 1),
            index: idx,
            type: q.type || 'qa',
            status: 'extracting',
            statusText: '已提取',
            searchCount: 0,
            skillsText: Array.isArray(q.skills) ? q.skills.join(', ') : 'core-math',
            preview: formatSingleLinePreview(q.content, 80)
          }))
        });
      },
      onStage1Done: (questions) => {
        this.setData({
          hasTasks: true,
          questionTasks: questions.map((q, idx) => ({
            id: q.id || String(idx + 1),
            index: idx,
            type: q.type || 'qa',
            status: 'extracted',
            statusText: '已提取',
            searchCount: 0,
            skillsText: Array.isArray(q.skills) ? q.skills.join(', ') : 'core-math',
            preview: formatSingleLinePreview(q.content, 80)
          })),
          reasoningText: ''
        });
      },
      onStage2Start: (questions) => {
        const initialTasks = questions.map((q, idx) => ({
          id: q.id || String(idx + 1),
          index: idx,
          type: q.type || 'qa',
          status: 'solving',
          statusText: '计算中…',
          searchCount: 0,
          skillsText: Array.isArray(q.skills) ? q.skills.join(', ') : 'core-math'
        }));
        this.setData({
          totalQuestions: questions.length,
          hasTasks: true,
          questionTasks: initialTasks,
          reasoningText: ''
        });
      },
      onStage2TaskProgress: (taskIndex, qId, info) => {
        const currentTasks = (this.data.questionTasks || []).slice();
        if (currentTasks[taskIndex]) {
          currentTasks[taskIndex] = Object.assign({}, currentTasks[taskIndex], {
            searchCount: (info && info.searchCount) || currentTasks[taskIndex].searchCount || 0
          });
          this.setData({ questionTasks: currentTasks });
        }
      },
      onStage2TaskDone: (taskIndex, qId, info) => {
        const currentTasks = (this.data.questionTasks || []).slice();
        if (currentTasks[taskIndex]) {
          currentTasks[taskIndex] = Object.assign({}, currentTasks[taskIndex], {
            status: 'done',
            statusText: '已完成 ✓',
            searchCount: (info && info.searchCount) !== undefined ? info.searchCount : (currentTasks[taskIndex].searchCount || 0)
          });
          this.setData({ questionTasks: currentTasks });
        }
      },
      onStage3Stream: (text, isFinal) => {
        this.renderStream(text, isFinal);
      },
      onNoQuestion: () => {
        this.handleNoQuestion();
      }
    };

    try {
      if (this.data.provider === 'api') {
        await runAgentApiPipeline({
          dataUrl: dataUrl,
          modelName: this._apiModel,
          callbacks: callbacks
        });
      } else {
        await runAgentBuiltinPipeline({
          dataUrl: dataUrl,
          LanguageModel: LanguageModel,
          callbacks: callbacks
        });
      }
    } catch (e) {
      this.fail('解题失败：' + ((e && e.message) || '未知错误'));
    }
  },

  renderStream(text, isFinal) {
    const raw = String(text || '');
    const clean = extractAnswerText(raw);
    if (isNoQuestion(clean)) {
      this.handleNoQuestion();
      return;
    }
    const blocks = isFinal ? buildBlocks(clean) : buildStreamingBlocks(clean);

    if (!hasVisibleContent(blocks)) {
      if (isFinal) {
        this.handleNoQuestion();
      }
      return;
    }

    this.clearTimers();
    const isFirstAnswerRender = this.data.phase !== 'answer';
    const patch = { phase: 'answer', errorText: '', answerBlocks: blocks };
    if (isFirstAnswerRender) {
      patch.scrollTop = 0;
    }
    this.setData(patch);
    this.drawFormulas(blocks);
  },

  drawFormulas(blocks) {
    const list = blocks || this.data.answerBlocks || [];
    const draw = () => {
      for (let k = 0; k < list.length; k++) {
        const b = list[k];
        if (b.type === 'formula' && b.canvasId && b.astLayout) {
          try {
            const ctx = wx.createCanvasContext(b.canvasId);
            if (ctx) {
              ctx.clearRect(0, 0, b.canvasWidth, b.canvasHeight);
              const baselineY = b.astLayout.ascent + 6;
              drawMathAst(ctx, b.astLayout, 6, baselineY, 22, '#40FF5E');
              if (typeof ctx.flush === 'function') ctx.flush();
              if (typeof ctx.draw === 'function') ctx.draw();
            }
          } catch (e) {}
        }
      }
    };
    setTimeout(draw, 40);
    setTimeout(draw, 180);
    setTimeout(draw, 350);
  },

  startProgress() {
    this.addTimer(110, () => {
      let progress = this.data.progress + 6;
      if (progress > 300) progress = 0;
      this.setData({ progress: progress });
    });
  },

  fail(message) {
    this.clearTimers();
    this.setData({ phase: 'error', errorText: message });
  }
};
</script>

<page>
  <view class="stage-capture" ink:if="{{phase === 'capture'}}">
    <text class="capture-count">{{countdown}}</text>
    <text class="provider-info">{{providerInfo}}</text>
  </view>

  <view class="stage-preview" ink:elif="{{phase === 'preview'}}">
    <view class="photo-preview">
      <image class="preview-img" src="{{photoSrc}}" mode="aspectFit"></image>
    </view>
  </view>

  <view class="stage-solving" ink:elif="{{phase === 'solving'}}">
    <view class="solving-top">
      <text class="stage-step">{{stageStep}}</text>
      <view class="progress-track">
        <view class="progress-dot" style="left: {{progress}}px;"></view>
      </view>
    </view>

    <!-- 步骤 1: 只显示题号和题目内容，禁止换行超出截断 -->
    <scroll-view class="task-scroll-box" scroll-y="true" ink:if="{{hasTasks && isStage1}}">
      <view class="task-list-stage1">
        <view class="task-stage1-row" ink:for="{{questionTasks}}" ink:key="id">
          <text class="task-stage1-num">题 {{item.id}}:</text>
          <text class="task-stage1-content">{{item.preview || '提取中…'}}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 步骤 2: 纯净展示题目状态（显示题号、完成状态与实时知识库检索次数） -->
    <scroll-view class="task-scroll-box-stage2" scroll-y="true" ink:if="{{hasTasks && !isStage1}}">
      <view class="task-grid-stage2">
        <view class="task-grid-item {{totalQuestions >= 3 ? 'task-grid-item-3col' : 'task-grid-item-2col'}}" ink:for="{{questionTasks}}" ink:key="id">
          <text class="task-num {{item.status === 'done' ? 'text-done' : 'text-active'}}">题 {{item.id}}:</text>
          <text class="task-status {{item.status === 'done' ? 'text-done' : 'text-active'}}">[{{item.statusText || (item.status === 'done' ? '已完成 ✓' : '计算中…')}}]</text>
          <text class="task-search-count" ink:if="{{item.searchCount > 0}}">(搜{{item.searchCount}}次)</text>
        </view>
      </view>
    </scroll-view>
  </view>

  <view class="stage-answer" ink:elif="{{phase === 'answer'}}">
    <scroll-view class="answer-scroll" scroll-y="true" auto-scroll="true" scroll-speed="16.0" scroll-direction="vertical" scroll-top="{{scrollTop}}">
      <view class="answer-block" ink:for="{{answerBlocks}}" ink:key="id">
        <text class="answer-text" ink:if="{{item.type === 'text'}}">{{item.text}}</text>
        <view class="formula-container" ink:elif="{{item.type === 'formula'}}">
          <text class="math-formula-text">{{item.unicode}}</text>
        </view>
        <text class="answer-text-pending" ink:elif="{{item.type === 'formula-pending'}}">{{item.text}}</text>
        <view class="answer-gap" ink:else></view>
      </view>
    </scroll-view>
  </view>

  <view class="stage-error" ink:else>
    <text class="error-msg">{{errorText}}</text>
  </view>
</page>

<style>
@import "./index.wxss";
</style>
