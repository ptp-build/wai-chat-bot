import {Int, Str} from '@cloudflare/itty-router-openapi';
import WaiOpenAPIRoute from '../share/cls/WaiOpenAPIRoute';
import {ENV} from '../env';
import OpenAIAgentService from '../share/service/autoGpt/agent-service';

export type ModelSettings = {
	customApiKey: string;
	customModelName: string;
	customTemperature: number;
	customMaxLoops: number;
};

const modelSettings = {
	customApiKey: new Str({
		example: '',
		description: 'openAi api_key',
	}),
	customModelName: new Str({
		example: 'gpt-3.5-turbo',
		description: 'chatGpt model: gpt-3.5-turbo | gpt-4',
	}),
	customTemperature: new Int({
		example: 0.9,
		description: '随机性 (temperature): 值越大，回复越随机',
	}),
	customMaxLoops: new Int({
		example: 3,
		description: 'customMaxLoops',
	}),
};

const requestStartGoalBody = {
	modelSettings,
	goal: new Str({
		example:
			'Research and implement natural language processing techniques to improve task creation accuracy.',
		description: 'goal',
	}),
};

const requestExecuteTaskBody = {
	...requestStartGoalBody,
	task: new Str({
		example: '1. Research state-of-the-art natural language processing techniques.',
		description: 'task',
	}),
};

const requestCreateTasksBody = {
	...requestStartGoalBody,
	tasks: [
		new Str({
			example: '',
			description: 'task',
		}),
	],
	lastTask: new Str({
		example: '',
		description: 'lastTask',
	}),

	result: new Str({
		example: '',
		description: 'result',
	}),
	completedTasks: [
		new Str({
			example: '',
			description: 'completedTask',
		}),
	],
};

export class AutoGptStartGoalAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['AutoGpt'],
		requestBody: requestStartGoalBody,
		responses: {
			'200': {
				schema: {},
			},
		},
	};

	async handle(request: Request, data: Record<string, any>) {
		try {
			if (!ENV.IS_PROD && !data.body.modelSettings.customApiKey) {
				data.body.modelSettings.customApiKey = ENV.OPENAI_API_KEY;
			}
			return {
				reply: await OpenAIAgentService.startGoalAgent(
					data.body.modelSettings,
					data.body.goal
				),
			};
		} catch (e) {
			console.error(e);
			return WaiOpenAPIRoute.responseError('system error');
		}
	}
}

export class AutoGptExecuteTaskAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['AutoGpt'],
		requestBody: requestExecuteTaskBody,
		responses: {
			'200': {
				schema: {},
			},
		},
	};

	async handle(request: Request, data: Record<string, any>) {
		try {
			if (!ENV.IS_PROD && !data.body.modelSettings.customApiKey) {
				data.body.modelSettings.customApiKey = ENV.OPENAI_API_KEY;
			}
			return {
				reply: await OpenAIAgentService.executeTaskAgent(
					data.body.modelSettings,
					data.body.goal,
					data.body.task
				),
			};
		} catch (e) {
			console.error(e);
			return WaiOpenAPIRoute.responseError('system error');
		}
	}
}

export class AutoGptCreateTasksAction extends WaiOpenAPIRoute {
	static schema = {
		tags: ['AutoGpt'],
		requestBody: requestCreateTasksBody,
		responses: {
			'200': {
				schema: {},
			},
		},
	};

	async handle(request: Request, data: Record<string, any>) {
		try {
			if (!ENV.IS_PROD && !data.body.modelSettings.customApiKey) {
				data.body.modelSettings.customApiKey = ENV.OPENAI_API_KEY;
			}
			return {
				reply: await OpenAIAgentService.createTasksAgent(
					data.body.modelSettings,
					data.body.goal,
					data.body.tasks,
					data.body.lastTask,
					data.body.result,
					data.body.completedTasks
				),
			};
		} catch (e) {
			console.error(e);
			return WaiOpenAPIRoute.responseError('system error');
		}
	}
}
