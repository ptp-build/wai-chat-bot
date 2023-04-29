import { createModel, startGoalPrompt, executeTaskPrompt, createTasksPrompt } from './prompts';
import type { ModelSettings } from './types';
import { LLMChain } from 'langchain/chains';
import { extractTasks } from './helpers';

async function startGoalAgent(modelSettings: ModelSettings, goal: string) {
	const completion = await new LLMChain({
		llm: createModel(modelSettings),
		prompt: startGoalPrompt,
	}).call({
		goal,
	});
	debugger;
	console.log('startGoalAgent Completion:' + (completion.text as string), completion);
	return extractTasks(completion.text as string, []);
}

async function executeTaskAgent(modelSettings: ModelSettings, goal: string, task: string) {
	const completion = await new LLMChain({
		llm: createModel(modelSettings),
		prompt: executeTaskPrompt,
	}).call({
		goal,
		task,
	});

	return completion.text as string;
}

async function createTasksAgent(
	modelSettings: ModelSettings,
	goal: string,
	tasks: string[],
	lastTask: string,
	result: string,
	completedTasks: string[] | undefined
) {
	const completion = await new LLMChain({
		llm: createModel(modelSettings),
		prompt: createTasksPrompt,
	}).call({
		goal,
		tasks,
		lastTask,
		result,
	});

	return extractTasks(completion.text as string, completedTasks || []);
}

interface AgentService {
	startGoalAgent: (modelSettings: ModelSettings, goal: string) => Promise<string[]>;
	executeTaskAgent: (modelSettings: ModelSettings, goal: string, task: string) => Promise<string>;
	createTasksAgent: (
		modelSettings: ModelSettings,
		goal: string,
		tasks: string[],
		lastTask: string,
		result: string,
		completedTasks: string[] | undefined
	) => Promise<string[]>;
}

const OpenAIAgentService: AgentService = {
	startGoalAgent: startGoalAgent,
	executeTaskAgent: executeTaskAgent,
	createTasksAgent: createTasksAgent,
};

export default OpenAIAgentService;
