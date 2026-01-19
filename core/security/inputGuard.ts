import type { Message } from "../types/type";
export type EmitOutput = {type:"emit";payload:{content:string}}
const MAX_INPUT_CHARS = 8000;
const BANNED_PATTERNS:RegExp[] = [
    /(\brm\s+-rf\b)/i,
    /(删除|清空).*(文件|目录|磁盘|数据库)/,
    /(窃取|盗取|偷).*(key|密钥|token|密码)/i,
    /(攻击|入侵|hack|ddos)/i,
    /(绕过|bypass).*(安全|鉴权|权限)/i,
]
export function inputGuard(input:string):EmitOutput|null {
    const text = String(input ?? '')
    if (!text.trim()) { 
        return {
            type: 'emit',
            payload: {
                content:'请输入你的目标/问题，我才能开始规划！'
            }
        }
    }

    if (text.length > MAX_INPUT_CHARS) {
        return {
            type: 'emit',
            payload: {
                content:`你的输入太长了（>${MAX_INPUT_CHARS} 字）。请缩短内容，或分多次提交。`
            }
        }
    }
    for (const re of BANNED_PATTERNS) {
        if (re.test(text)) {
            return {
                type: 'emit',
                payload: {
                    content:'出于安全原因，我不能帮助执行该请求。你可以换一种安全的目标描述。'
                }
            }
        }
    }
    return null
}