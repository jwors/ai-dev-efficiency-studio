import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
	try {
		const body = await req.formData().catch(() => null);
		console.log(body)
		const emailRaw = body?.get('email');
		const passwordRaw = body?.get("password");

		const email = String(emailRaw || "").toLowerCase().trim();
		const password = String(passwordRaw || "");
		//邮箱必填
		if (!email) {
			return NextResponse.json({
				error: "邮箱必填",
			},
				{
					status: 400
				}
			)
		}
		// 密码限制
		if (password.length < 8) {
			return NextResponse.json({
				error: '密码至少 8 位'
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

		// 密码转hsh
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
		console.log(e)
		return NextResponse.json({
			error:"服务器错误",
		},
			{
				status:500
			})
	}
}