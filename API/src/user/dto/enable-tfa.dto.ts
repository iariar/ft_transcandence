import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class twoFaDto {
  @IsEmail()
  @IsNotEmpty()
  @IsString()
  email: string;

  @IsBoolean()
  twoFaStatus: boolean;
}
