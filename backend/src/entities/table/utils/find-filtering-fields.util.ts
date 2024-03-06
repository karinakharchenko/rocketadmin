import { FilteringFieldsDs } from '../application/data-structures/found-table-rows.ds.js';
import { FilterCriteriaEnum } from '../../../enums/index.js';
import { TableStructureDS } from '@rocketadmin/shared-code/dist/src/data-access-layer/shared/data-structures/table-structure.ds.js';

export function findFilteringFieldsUtil(
  filters: Record<string, unknown>,
  tableStructure: Array<TableStructureDS>,
): Array<FilteringFieldsDs> {
  const rowNames = tableStructure.map((el) => {
    return el.column_name;
  });
  const filteringItems = [];
  for (const fieldname of rowNames) {
    if (filters.hasOwnProperty(`f_${fieldname}__eq`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.eq,
        value: filters[`f_${fieldname}__eq`],
      });
    }

    if (filters.hasOwnProperty(`f_${fieldname}__startswith`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.startswith,
        value: filters[`f_${fieldname}__startswith`],
      });
    }
    if (filters.hasOwnProperty(`f_${fieldname}__endswith`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.endswith,
        value: filters[`f_${fieldname}__endswith`],
      });
    }
    if (filters.hasOwnProperty(`f_${fieldname}__gt`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.gt,
        value: filters[`f_${fieldname}__gt`],
      });
    }
    if (filters.hasOwnProperty(`f_${fieldname}__lt`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.lt,
        value: filters[`f_${fieldname}__lt`],
      });
    }
    if (filters.hasOwnProperty(`f_${fieldname}__lte`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.lte,
        value: filters[`f_${fieldname}__lte`],
      });
    }
    if (filters.hasOwnProperty(`f_${fieldname}__gte`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.gte,
        value: filters[`f_${fieldname}__gte`],
      });
    }
    if (filters.hasOwnProperty(`f_${fieldname}__contains`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.contains,
        value: filters[`f_${fieldname}__contains`],
      });
    }
    if (filters.hasOwnProperty(`f_${fieldname}__icontains`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.icontains,
        value: filters[`f_${fieldname}__icontains`],
      });
    }

    if (filters.hasOwnProperty(`f_${fieldname}__empty`)) {
      filteringItems.push({
        field: fieldname,
        criteria: FilterCriteriaEnum.empty,
        value: filters[`f_${fieldname}__empty`],
      });
    }
  }
  return filteringItems;
}
