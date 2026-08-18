<script def>
{
  "navigationBarTitleText": "随身答题 (Easy)"
}
</script>

<script setup>
import wx from 'wx';
import { LanguageModel } from 'language-model';
import { API_MODELS } from '../../config.js';
import { drawMathAst, buildBlocks, buildStreamingBlocks } from '../../utils/latex-renderer.js';
import { isNoQuestion, extractAnswerText, hasVisibleContent } from '../../utils/prompts.js';
import { captureCameraPhoto } from '../../utils/camera-helper.js';
import { streamSolveApi, streamSolveBuiltin } from '../../services/solver-engine.js';

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
    statusText: '正在连接模型…',
    reasoningText: '',
    thinkingScrollTop: 0,
    progress: 0,
    answerBlocks: [],
    scrollTop: 0,
    errorText: '',
    provider: 'api',
    providerInfo: 'gemini-3.7-flash'
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
      statusText: '正在连接模型…',
      reasoningText: '',
      thinkingScrollTop: 0,
      answerBlocks: [],
      scrollTop: 0,
      countdown: 3,
      progress: 0
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
      statusText: '正在理解问题…',
      reasoningText: '',
      thinkingScrollTop: 0
    });
    this.startProgress();

    const callbacks = {
      onReasoning: (fullReasoning) => {
        this.setData({
          reasoningText: fullReasoning,
          thinkingScrollTop: (this.data.thinkingScrollTop || 0) + 1000
        });
      },
      onStream: (text, isFinal) => {
        this.renderStream(text, isFinal);
      },
      onNoQuestion: () => {
        this.handleNoQuestion();
      }
    };

    try {
      if (this.data.provider === 'api') {
        await streamSolveApi({
          dataUrl: dataUrl,
          modelName: this._apiModel,
          callbacks: callbacks
        });
      } else {
        await streamSolveBuiltin({
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
      <text class="status-msg">{{statusText}}</text>
      <view class="progress-track">
        <view class="progress-dot" style="left: {{progress}}px;"></view>
      </view>
    </view>
    <scroll-view class="thinking-scroll" scroll-y="true" scroll-top="{{thinkingScrollTop}}" ink:if="{{reasoningText}}">
      <text class="reasoning-text">{{reasoningText}}</text>
    </scroll-view>
  </view>

  <view class="stage-answer" ink:elif="{{phase === 'answer'}}">
    <scroll-view class="answer-scroll" scroll-y="true" auto-scroll="true" scroll-speed="16.0" scroll-direction="vertical" scroll-top="{{scrollTop}}">
      <view class="answer-block" ink:for="{{answerBlocks}}" ink:key="id">
        <text class="answer-text" ink:if="{{item.type === 'text'}}">{{item.text}}</text>
        <view class="formula-container" ink:elif="{{item.type === 'formula'}}">
          <canvas id="{{item.canvasId}}" width="{{item.canvasWidth}}" height="{{item.canvasHeight}}" class="math-canvas"></canvas>
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