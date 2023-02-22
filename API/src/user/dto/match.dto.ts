import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class matchDto {
  @IsNotEmpty()
  @IsBoolean()
  won: boolean;

  @IsNotEmpty()
  @IsString()
  opponent: string;
}
