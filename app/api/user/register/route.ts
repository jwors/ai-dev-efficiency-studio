import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma';
import { validatePassword } from '@/lib/validators';

/**
 * 用户注册的 POST 端点。
 * 验证邮箱和密码，创建新用户并返回用户信息。
 * @param req - 请求对象，FormData 包含 email 和 password
 * @returns 创建的用户信息或错误响应
 */
export async function POST(req: Request) {
	try {
		const body = await req.formData().catch(() => null);
		const emailRaw = body?.get('email');
		const passwordRaw = body?.get("password");

		const email = String(emailRaw || "").toLowerCase().trim();
		const password = String(passwordRaw || "");
		//邮箱必填
		if (!email) {
			return NextResponse.json({
				error: "请输入邮箱地址",
			},
				{
					status: 400
				}
			)
		}
		// 密码验证
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			return NextResponse.json({
				error: passwordValidation.errors[0],
			},
				{
					status: 400
				})
		}
		// 是否已经注册
		const exist = await prisma.user.findUnique({ where: { email } });

		if (exist) {
			return NextResponse.json({
				error: "该邮箱已注册",
			},
				{
					status: 400
				})
		}

		// 密码转hash
		const passwordHash = await bcrypt.hash(password, 12);
		const user = await prisma.user.create({
			data: {
				email,
				passwordHash
			},
			select: { id: true, email: true, name: true, createdAt: true },
		})
		return NextResponse.json({
			ok: true,
			user
		},
			{
				status:201
			})
	} catch (e) {
		return NextResponse.json({
			error:"服务器错误",
		},
			{
				status:500
			})
	}
}