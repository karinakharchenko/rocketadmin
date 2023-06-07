import { QueryOrderingEnum } from '../../../../enums/index.js';
import { CustomFieldsEntity } from '../../../custom-field/custom-fields.entity.js';
import { TableActionEntity } from '../../../table-actions/table-action.entity.js';
import { TableWidgetEntity } from '../../../widget/table-widget.entity.js';

export class FoundTableSettingsDs {
  id: string;
  table_name: string;
  display_name: string;
  search_fields: Array<string>;
  excluded_fields: Array<string>;
  list_fields: Array<string>;
  identification_fields: Array<string>;
  list_per_page: number;
  ordering: QueryOrderingEnum;
  ordering_field: string;
  identity_column: string;
  readonly_fields: Array<string>;
  sensitive_fields: Array<string>;
  sortable_by: Array<string>;
  autocomplete_columns: Array<string>;
  columns_view: Array<string>;
  connection_id: string;
  custom_fields: Array<CustomFieldsEntity>;
  table_widgets: Array<TableWidgetEntity>;
  table_actions: Array<TableActionEntity>;
  can_add: boolean;
  can_delete: boolean;
  can_update: boolean;
  icon: string;
}
