export interface LLMProvider { 
	call(prompt:string):Promise<string>
}