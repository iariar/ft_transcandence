// import { PassportStrategy } from "@nestjs/passport";
// import { Strategy } from "passport-jwt";


// export class googleStrategy extends PassportStrategy(Strategy, 'google'){
// 	constructor(){
// 		super({
// 			clientId : '',
// 			clientSecret: "",
// 			callbackUrl: "",
// 			scope: ""
// 		})
// 	}

// 	async validate(access_token:string, refresh_tokem:string, profile: any){
// 		const {name, emails} = profile
// 		const user = {
// 			email: emails[0].value,
// 			firstName: name.givenName,
// 			lastName: name.familyName,
// 			access_token
// 		}
// 		return user
// 	}
// }