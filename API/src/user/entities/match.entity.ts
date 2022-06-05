import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { UserEntity } from './user.entity'

@Entity()
export class Match {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	won: boolean;

	@Column()
	oppenent: string;
}
