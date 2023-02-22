import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @IsEmail()
  @IsNotEmpty()
  login: string;

  @IsNotEmpty()
  @IsString()
  username: string;
}
