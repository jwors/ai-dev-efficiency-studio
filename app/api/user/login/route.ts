import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt'
import { prisma } from '@/lib/prisma';
import { error } from 'console';

export async function POST(req:Request	) { 
	try {
		const body = await req.json().catch(() => null);
		const email = String(body?.email || "").toLowerCase().trim();
		const password = String(body?.password || "");

		if (!email || !password) {
			return NextResponse.json({
				error:'邮箱和密码必填'
			},
				{
				status:400
			})
		}
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user || !user.passwordHash) {
			return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
		}
		const ok = await bcrypt.compare(password, user.passwordHash);

		if (!ok) {
      return NextResponse.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

		return NextResponse.json(
      {
        ok: true,
        user: { id: user.id, email: user.email, name: user.name },
      },
      { status: 200 }
    );

	} catch (e) {
		return NextResponse.json({ error: "服务器错误" }, { status: 500 });

	}
}