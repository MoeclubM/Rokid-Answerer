// ===================================================
// 全学科计算工具总线与 Markdown 技能文档中心 (Tool & Skill Center)
// 所有计算与检索工具全量常驻，技能 Markdown 文档按需查阅
// ===================================================

import { mathEvaluateExpression, CORE_MATH_TOOL_SCHEMAS } from './core-math.js';
import {
  mathDerivative,
  mathIntegrate,
  mathSolveQuadratic,
  mathSolveLinear2x2,
  mathFindRoot,
  CALCULUS_ALGEBRA_TOOL_SCHEMAS
} from './calculus-algebra.js';
import { mathComplexCalc, COMPLEX_ANALYSIS_TOOL_SCHEMAS } from './complex-analysis.js';
import {
  mathDiscreteConvolution,
  mathFrequencyResponse,
  SIGNALS_SYSTEMS_TOOL_SCHEMAS
} from './signals-systems.js';
import {
  mathTransmissionLine,
  mathEmWaveParams,
  ELECTROMAGNETICS_TOOL_SCHEMAS
} from './electromagnetics.js';
import {
  mathVectorCalc,
  mathStatistics,
  GEOMETRY_STATISTICS_TOOL_SCHEMAS
} from './geometry-statistics.js';
import { TOOL_WEB_SEARCH, executeWebSearch } from './web-search.js';
import { searchKnowledgeBase } from '../knowledge/index.js';
import { getSkillDoc, listAvailableSkills } from '../skills/index.js';

export { TOOL_WEB_SEARCH, executeWebSearch, getSkillDoc, listAvailableSkills };

// 查阅学科解题策略与工具调用指南（技能 ≠ 知识库）
export const TOOL_READ_SKILL_DOC = {
  type: 'function',
  function: {
    name: 'read_skill_document',
    description: '查阅学科解题策略文档，了解该领域应调用哪些工具、如何检索知识库、何时联网搜索。可选: "calculus-algebra" (微积分/代数), "complex-analysis" (复变函数), "signals-systems" (信号系统), "electromagnetics" (电磁场与波), "geometry-statistics" (空间几何/统计), "general-qa" (通用问答/代码)',
    parameters: {
      type: 'object',
      properties: {
        skill_name: {
          type: 'string',
          enum: ['calculus-algebra', 'complex-analysis', 'signals-systems', 'electromagnetics', 'geometry-statistics', 'general-qa'],
          description: '要查阅的技能文档标识符'
        }
      },
      required: ['skill_name']
    }
  }
};

// 知识库 RAG 检索工具
export const TOOL_SEARCH_KNOWLEDGE = {
  type: 'function',
  function: {
    name: 'search_knowledge_base',
    description: '专业学科知识库检索：检索信号与系统、复变函数、电磁场与电磁波等领域的经典题型解法、定理公式、标准解题步骤与知识点文档。遇到专业理科问题或定理应用时请调用。',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '检索关键词或题型特征（例如："留数定理 计算实积分", "连续卷积积分", "传输线输入阻抗", "拉普拉斯变换 系统稳定性", "均匀平面波"）'
        },
        domain: {
          type: 'string',
          enum: ['all', 'signals-systems', 'complex-analysis', 'electromagnetics'],
          description: '限定检索的学科领域，默认 all'
        }
      },
      required: ['query']
    }
  }
};

// 基础通用常驻工具集（知识库检索、联网搜索、基础代数计算、查阅与动态挂载技能）
export const BASE_SYSTEM_TOOLS = [
  TOOL_READ_SKILL_DOC,
  TOOL_SEARCH_KNOWLEDGE,
  TOOL_WEB_SEARCH,
  ...CORE_MATH_TOOL_SCHEMAS
];

// 学科专属工具映射表（按技能动态加载）
export const SKILL_TOOL_MAP = {
  'calculus-algebra': CALCULUS_ALGEBRA_TOOL_SCHEMAS,
  'complex-analysis': COMPLEX_ANALYSIS_TOOL_SCHEMAS,
  'signals-systems': SIGNALS_SYSTEMS_TOOL_SCHEMAS,
  'electromagnetics': ELECTROMAGNETICS_TOOL_SCHEMAS,
  'geometry-statistics': GEOMETRY_STATISTICS_TOOL_SCHEMAS,
  'general-qa': []
};

// 全量工具集（用于兼容查询）
export const ALL_SYSTEM_TOOLS = [
  ...BASE_SYSTEM_TOOLS,
  ...CALCULUS_ALGEBRA_TOOL_SCHEMAS,
  ...COMPLEX_ANALYSIS_TOOL_SCHEMAS,
  ...SIGNALS_SYSTEMS_TOOL_SCHEMAS,
  ...ELECTROMAGNETICS_TOOL_SCHEMAS,
  ...GEOMETRY_STATISTICS_TOOL_SCHEMAS
];

/**
 * 根据指定技能列表动态组装工具集
 */
export function getToolsForSkills(skillNames = []) {
  const tools = [...BASE_SYSTEM_TOOLS];
  const toolNameSet = new Set(tools.map(t => t.function.name));

  const list = Array.isArray(skillNames) ? skillNames : (skillNames ? [skillNames] : []);
  for (let k = 0; k < list.length; k++) {
    const sName = list[k];
    const skillTools = SKILL_TOOL_MAP[sName] || [];
    for (let ti = 0; ti < skillTools.length; ti++) {
      const t = skillTools[ti];
      if (!toolNameSet.has(t.function.name)) {
        tools.push(t);
        toolNameSet.add(t.function.name);
      }
    }
  }
  return tools;
}

// 统一工具执行分发中心
export async function executeTool(name, args, session = null) {
  try {
    const p = typeof args === 'string' ? JSON.parse(args) : (args || {});

    // 查阅/动态挂载技能 Markdown 文档及专属工具
    if (name === 'read_skill_document' || name === 'load_skill') {
      const docName = p.skill_name || p.name;
      const content = getSkillDoc(docName);
      if (content) {
        let toolsLoaded = [];
        if (session && typeof session.loadSkill === 'function') {
          session.loadSkill(docName);
          toolsLoaded = (SKILL_TOOL_MAP[docName] || []).map(t => t.function.name);
        }
        return {
          status: 'success',
          skill_name: docName,
          document: content,
          tools_loaded: toolsLoaded
        };
      }
      return {
        status: 'error',
        message: '未找到技能文档 [' + docName + ']，可用技能: ' + listAvailableSkills().join(', ')
      };
    }

    // 国内免代理联网搜索
    if (name === 'web_search') {
      return await executeWebSearch(p.query);
    }

    // 知识库检索
    if (name === 'search_knowledge_base') {
      const results = searchKnowledgeBase(p.query, p.domain || 'all');
      return {
        status: 'success',
        query: p.query,
        count: results.length,
        results: results
      };
    }

    // 通用计算
    if (name === 'calculate') {
      const val = mathEvaluateExpression(p.expression);
      return { status: 'success', result: val };
    }

    // calculus-algebra
    if (name === 'differentiate') {
      const val = mathDerivative(p.function_expr, p.variable, p.point);
      return { status: 'success', result: val };
    }
    if (name === 'integrate') {
      const val = mathIntegrate(p.function_expr, p.variable, p.lower_bound, p.upper_bound);
      return { status: 'success', result: val };
    }
    if (name === 'solve_quadratic') {
      const val = mathSolveQuadratic(p.a, p.b, p.c);
      return { status: 'success', roots: val };
    }
    if (name === 'solve_linear_system_2x2') {
      return mathSolveLinear2x2(p.a1, p.b1, p.c1, p.a2, p.b2, p.c2);
    }
    if (name === 'find_equation_root') {
      return mathFindRoot(p.function_expr, p.variable, p.initial_guess);
    }

    // complex-analysis
    if (name === 'complex_calculate') {
      return mathComplexCalc(p.operation, p.z1, p.z2);
    }

    // signals-systems
    if (name === 'discrete_convolution') {
      return mathDiscreteConvolution(p.x, p.h);
    }
    if (name === 'frequency_response') {
      return mathFrequencyResponse(p.numerator_coeffs, p.denominator_coeffs, p.omega);
    }

    // electromagnetics
    if (name === 'transmission_line_calc') {
      return mathTransmissionLine(p.zL, p.z0);
    }
    if (name === 'em_wave_calc') {
      return mathEmWaveParams(p.frequency, p.eps_r, p.mu_r, p.sigma);
    }

    // geometry-statistics
    if (name === 'vector_calculate') {
      return mathVectorCalc(p.operation, p.v1, p.v2);
    }
    if (name === 'statistics_calculate') {
      return mathStatistics(p.numbers);
    }

    return { status: 'error', error: '未识别的工具: ' + name };
  } catch (err) {
    return { status: 'error', error: (err && err.message) || String(err) };
  }
}

// 求解 Agent 会话类 (按需动态挂载技能与工具)
export class AgentSession {
  constructor(sessionId, roleName, baseSystemPrompt, modelName, effort, initialSkills = []) {
    this.sessionId = sessionId;
    this.roleName = roleName;
    this.modelName = modelName;
    this.effort = effort;
    this.baseSystemPrompt = baseSystemPrompt;
    this.loadedSkills = new Set();
    this.turnCount = 0;
    this.searchCount = 0;

    // 初始化基础工具与消息数组
    this.tools = [...BASE_SYSTEM_TOOLS];
    this.toolNameSet = new Set(this.tools.map(t => t.function.name));
    this.messages = [];

    // 按需动态加载初始技能与专属工具
    if (Array.isArray(initialSkills) && initialSkills.length > 0) {
      for (let k = 0; k < initialSkills.length; k++) {
        this.loadSkill(initialSkills[k]);
      }
    }

    this.systemPrompt = this.buildFullSystemPrompt();
    this.messages = [{ role: 'system', content: this.systemPrompt }];
  }

  /**
   * 动态加载一个技能（挂载 Markdown 策略文档 + 注入专属工具 Schema）
   */
  loadSkill(skillName) {
    if (!skillName || this.loadedSkills.has(skillName)) return false;
    this.loadedSkills.add(skillName);

    // 动态注入该学科的专属工具
    const domainTools = SKILL_TOOL_MAP[skillName] || [];
    for (let ti = 0; ti < domainTools.length; ti++) {
      const tool = domainTools[ti];
      if (!this.toolNameSet.has(tool.function.name)) {
        this.tools.push(tool);
        this.toolNameSet.add(tool.function.name);
      }
    }

    // 动态更新 System Prompt
    this.systemPrompt = this.buildFullSystemPrompt();
    if (this.messages.length > 0 && this.messages[0].role === 'system') {
      this.messages[0].content = this.systemPrompt;
    }
    return true;
  }

  buildFullSystemPrompt() {
    let prompt = this.baseSystemPrompt;
    if (this.loadedSkills.size > 0) {
      const docSnippets = [];
      for (const sName of this.loadedSkills) {
        const doc = getSkillDoc(sName);
        if (doc) docSnippets.push(doc);
      }
      if (docSnippets.length > 0) {
        prompt += '\n\n【参考学科技能文档】\n' + docSnippets.join('\n\n');
      }
    }
    return prompt;
  }

  addUserMessage(content) {
    this.messages.push({ role: 'user', content: content });
  }

  addAssistantMessage(content, toolCalls = null) {
    const msg = { role: 'assistant', content: content || null };
    if (toolCalls && toolCalls.length > 0) {
      msg.tool_calls = toolCalls;
    }
    this.messages.push(msg);
  }

  addToolResult(toolCallId, result) {
    this.messages.push({
      role: 'tool',
      tool_call_id: toolCallId,
      content: typeof result === 'string' ? result : JSON.stringify(result)
    });
  }
}
