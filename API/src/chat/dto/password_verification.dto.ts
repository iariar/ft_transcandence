import { IsNotEmpty, IsString } from 'class-validator';

export class passwordVerificationDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  password: string;
}
