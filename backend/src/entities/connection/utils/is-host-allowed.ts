import * as dns from 'dns';
import ipRangeCheck from 'ip-range-check';
import { Constants } from '../../../helpers/constants/constants';
import { CreateConnectionDto } from '../dto';
import { isConnectionEntityAgent } from '../../../helpers';
import { isSaaS } from '../../../helpers/app/is-saas';

export async function isHostAllowed(connectionData: CreateConnectionDto): Promise<boolean> {
  if (isConnectionEntityAgent(connectionData) || process.env.NODE_ENV === 'test') {
    return true;
  }
  if (process.env.NODE_ENV !== 'test' && !isSaaS()) {
    return true;
  }

  return new Promise<boolean>((resolve, reject) => {
    const testHosts = Constants.getTestConnectionsHostNamesArr();
    if (!connectionData.ssh) {
      dns.lookup(connectionData.host, (err, address, family) => {
        if (ipRangeCheck(address, Constants.FORBIDDEN_HOSTS) && !testHosts.includes(connectionData.host)) {
          resolve(false);
        } else {
          resolve(true);
        }
        if (err) {
          reject(err);
        }
      });
    } else if (connectionData.ssh && connectionData.sshHost) {
      dns.lookup(connectionData.sshHost, (err, address, family) => {
        if (ipRangeCheck(address, Constants.FORBIDDEN_HOSTS) && !testHosts.includes(connectionData.host)) {
          resolve(false);
        } else {
          resolve(true);
        }
        if (err) {
          reject(err);
        }
      });
    }
  }).catch((e) => {
    console.error('DNS lookup error message', e.message);
    return false;
  });
}
