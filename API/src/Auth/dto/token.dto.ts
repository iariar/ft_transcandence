import { IsNotEmpty, IsString } from "class-validator";


export class tokenDto {
	@IsNotEmpty()
	token: string;
}
