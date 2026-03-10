import type { Plan } from '@/core/planner/schema';
import type { EmitOutput } from './inputGuard';

// 危险的搜索查询关键词
const DANGEROUS_SEARCH_QUERIES = [
    /漏洞利用|exploit/i,
    /免杀|bypass\s*antivirus/i,
    /提权 |privilege\s*escalation/i,
    /后门 |backdoor/i,
    /木马 |trojan|webshell/i,
    /注入攻击|sql\s*injection/i,
    /跨站脚本|xss\s*attack/i,
    /密码破解 |password\s*crack/i,
    /钓鱼网站 |phishing\s*site/i,
    /DDoS|dos 攻击/i,
];

// 危险的文件路径模式
const DANGEROUS_FILE_PATHS = [
    /\/etc\/passwd/i,
    /\/etc\/shadow/i,
    /\.env$/i,
    /id_rsa/i,
    /credentials/i,
    /password/i,
];

export interface PlanCheckResult {
    blocked: boolean;
    reason?: string;
}

/**
 * 检查 Plan 中的任务是否安全。
 * 在 Executor 执行前进行最后一道安全检查。
 * @param plan - 待检查的计划对象
 * @returns 检查结果，包含是否拦截和原因
 */
export function checkPlanSafety(plan: Plan): PlanCheckResult {
    for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        const stepNum = i + 1;

        // 检查 web.search 任务
        if (step.action === 'web.search') {
            const query = String(step.params?.query ?? '');
            for (const pattern of DANGEROUS_SEARCH_QUERIES) {
                if (pattern.test(query)) {
                    return {
                        blocked: true,
                        reason: `步骤 ${stepNum} (web.search): 搜索查询包含危险关键词 "${query}"`,
                    };
                }
            }
        }

        // 检查 web.fetch 任务
        if (step.action === 'web.fetch') {
            const url = String(step.params?.url ?? '');
            // 检查 URL 是否指向危险内容
            const dangerousUrlPatterns = [
                /hackers?\.com/i,
                /exploit-db/i,
                /pastebin\.com.*exploit/i,
            ];
            for (const pattern of dangerousUrlPatterns) {
                if (pattern.test(url)) {
                    return {
                        blocked: true,
                        reason: `步骤 ${stepNum} (web.fetch): URL 指向可疑内容 "${url}"`,
                    };
                }
            }
        }

        // 检查 file.write 任务
        if (step.action === 'file.write') {
            const path = String(step.params?.path ?? '');
            const content = String(step.params?.content ?? '');

            // 检查写入路径
            for (const pattern of DANGEROUS_FILE_PATHS) {
                if (pattern.test(path)) {
                    return {
                        blocked: true,
                        reason: `步骤 ${stepNum} (file.write): 试图写入敏感文件 "${path}"`,
                    };
                }
            }

            // 检查写入内容
            const dangerousContentPatterns = [
                /<\?php\s+\$eval/i,  // PHP webshell
                /bash\s+-i\s+>&/i,   // 反弹 shell
                /nc\s+-e\s+\/bin/i,  // netcat 反弹
                /chmod\s+777/i,      // 危险权限
                /rm\s+-rf\s+\//i,    // 删除根目录
            ];
            for (const pattern of dangerousContentPatterns) {
                if (pattern.test(content)) {
                    return {
                        blocked: true,
                        reason: `步骤 ${stepNum} (file.write): 文件内容包含危险代码`,
                    };
                }
            }
        }

        // 检查 http 任务
        if (step.action === 'http') {
            const url = String(step.params?.url ?? '');
            const method = String(step.params?.method ?? 'GET');

            // 检查是否试图访问内网
            const internalUrlPatterns = [
                /localhost/i,
                /127\.0\.0\.1/i,
                /192\.168\./i,
                /10\.\d+\./i,
                /172\.(1[6-9]|2[0-9]|3[01])\./i,
            ];
            for (const pattern of internalUrlPatterns) {
                if (pattern.test(url)) {
                    return {
                        blocked: true,
                        reason: `步骤 ${stepNum} (http): 试图访问内网地址 "${url}"`,
                    };
                }
            }
        }
    }

    return { blocked: false };
}
