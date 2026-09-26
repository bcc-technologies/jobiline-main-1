import { Column, Entity, PrimaryColumn, ManyToMany } from 'typeorm';
import { EntityRelationalHelper } from '../../../../../utils/relational-entity-helper';
import { UserEntity } from '../../../../../users/infrastructure/persistence/relational/entities/user.entity';

@Entity({
  name: 'role',
})
export class RoleEntity extends EntityRelationalHelper {
  @PrimaryColumn()
  id: number;

  @Column()
  name?: string;

  @Column({ unique: true })
  code?: string;

  @ManyToMany(() => UserEntity, (user) => user.roles)
  users?: UserEntity[];
}
