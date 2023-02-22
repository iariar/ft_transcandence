import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class roomCreationDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  password: string;

  @IsBoolean()
  @IsNotEmpty()
  mode: boolean;
}
