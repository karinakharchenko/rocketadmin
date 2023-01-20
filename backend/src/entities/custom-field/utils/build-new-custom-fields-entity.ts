import { CreateCustomFieldsDs } from '../application/data-structures/create-custom-fields.ds.js';
import { CustomFieldsEntity } from '../custom-fields.entity.js';

export function buildNewCustomFieldsEntity(inputData: CreateCustomFieldsDs): CustomFieldsEntity {
  const {
    createFieldDto: { template_string, text, type },
  } = inputData;
  const newCustomField = new CustomFieldsEntity();
  newCustomField.template_string = template_string;
  newCustomField.text = text;
  newCustomField.type = type;
  return newCustomField;
}
