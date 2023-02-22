import { IsNotEmpty, IsString } from 'class-validator';

export class tokenDto {
  @IsNotEmpty()
  @IsString()
  token: string;
}
