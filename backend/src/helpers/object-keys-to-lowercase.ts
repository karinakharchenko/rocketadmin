import { isObjectPropertyExists } from './validators/is-object-property-exists-validator.js';

export function objectKeysToLowercase(obj: any): any {
  let key;
  const keys = Object.keys(obj);
  let n = keys.length;
  const newobj = {};
  while (n--) {
    key = keys.at(n);
    if (isObjectPropertyExists(obj, key)) {
      // eslint-disable-next-line security/detect-object-injection
      newobj[key.toLowerCase()] = obj[key];
    }
  }
  return newobj;
}
