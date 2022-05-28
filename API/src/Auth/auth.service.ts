import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from 'src/user/entities/user.entity';

@Injectable()
export class AuthService {
	constructor(private jwt: JwtService,
		private configService: ConfigService,
		@InjectRepository(UserEntity)
		private readonly userRepository: Repository<UserEntity>,
	) { }

	async signup(login: string) {
		return (this.signToken(login))
	}

	async signToken(Login: string) {
		const payload = {
			login: Login
		}
		let token: string = ""
		let username = ""

		token = await (this.jwt.sign(payload, {
			expiresIn: '7d',
			secret: this.configService.get('JWT_SECRET')
		}))
		// tokens.refresh_token = await (this.jwt.signAsync(payload, {
		// 	expiresIn: '7d',
		// 	secret: this.configService.get('JWT_REFRESH_SECRET')
		// }))
		// console.log(Login)
		const user = await this.userRepository.findOneBy({ login: Login })
		if (user)
			username = user.username
		return { access_token: token, username }
	}

	///////////2FA/////////





}
