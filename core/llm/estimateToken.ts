import { Message } from '../types/type'
function estimateTokens(text: string) {
	// 中文在存储方面逼英文大 2 到 3倍
	/*
		中文一个汉字通常占用2-3个字节（如GBK 2字节，UTF-8 3字节），
		英文一个字母占用1个字节
	*/
	return Math.ceil(text.length / 2)
}

export function estimateMessagesTokens(message: Message[]) { 
	let t = 0; 
	for (const m of message) { 
		t += 12
		t += estimateTokens(m.content)
		
	}

	return t
}