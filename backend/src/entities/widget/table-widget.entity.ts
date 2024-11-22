import sjson from 'secure-json-parse';
import {
  AfterLoad,
  BeforeInsert,
  BeforeUpdate,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { WidgetTypeEnum } from '../../enums/index.js';
import { TableSettingsEntity } from '../table-settings/table-settings.entity.js';

@Entity('table_widget')
export class TableWidgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  field_name: string;

  @Column({ default: null, type: 'varchar' })
  widget_type?: WidgetTypeEnum;

  @Column('json', { default: null })
  widget_params: string;

  @Column('json', { default: null })
  widget_options: string;

  @Column({ default: null })
  name?: string;

  @Column({ default: null })
  description?: string;

  @BeforeUpdate()
  stringifyOptionsOnUpdate() {
    try {
      if (this.widget_options) {
        this.widget_options = JSON.stringify(this.widget_options);
      }
    } catch (e) {
      console.log('-> Error widget options stringify ' + e.message);
    }
  }

  @BeforeInsert()
  stringifyOptions() {
    try {
      if (this.widget_options) {
        this.widget_options = JSON.stringify(this.widget_options);
      }
    } catch (e) {
      console.log('-> Error widget options stringify ' + e.message);
    }
  }

  @AfterLoad()
  parseOptions() {
    try {
      if (this.widget_options) {
        this.widget_options = sjson.parse(this.widget_options, null, {
          protoAction: 'remove',
          constructorAction: 'remove',
        });
      }
    } catch (e) {
      console.log('-> Error widget options parse ' + e.message);
    }
  }

  @ManyToOne(() => TableSettingsEntity, (settings) => settings.table_widgets, { onDelete: 'CASCADE' })
  @JoinColumn()
  settings: Relation<TableSettingsEntity>;
}
