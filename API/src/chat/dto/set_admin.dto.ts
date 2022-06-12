import { IsBoolean, IsNotEmpty, IsString } from "class-validator"

export class setAdminDto {

	@IsString()
	@IsNotEmpty()
	username: string

	@IsString()
	@IsNotEmpty()
	description: string

	@IsBoolean()
	set: boolean

}