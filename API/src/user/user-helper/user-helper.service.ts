import { Injectable } from '@nestjs/common'
import { of } from 'rxjs'
import { CreateUserDto } from '../dto/create-user.dto'
import { LoginUserDto } from '../dto/login-user.dto'

@Injectable()
export class UserHelperService {


	CreatUserDtoEntity(UserDto: CreateUserDto) {
		return  of( {
			email: UserDto.login,
			username: UserDto.username
		})
	}
	
	loginUserDtoToEntity(UserDto: LoginUserDto){
		return of ({
			email: UserDto.login,
			password: UserDto.username
		})
	}
}
