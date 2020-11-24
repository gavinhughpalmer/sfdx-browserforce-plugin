import { BrowserforcePlugin } from '../../plugin';

const PATHS = {
  BASE: 'p/own/DeferSharingSetupPage'
};
const SELECTORS = {
  SUSPEND_BUTTON: 'input[name="rule_suspend"]',
  RESUME_BUTTON: 'input[name="rule_resume"]',
  RECALCULATE_BUTTON: 'input[name="rule_recalc"]',
  INSUFFICIENT_PRIVILEGES: 'document.querySelector("body").innerText.includes("Insufficient Privileges")'
};

export default class DeferSharingCalculation extends BrowserforcePlugin {
  public async retrieve(definition?) {
    const page = await this.browserforce.openPage(PATHS.BASE);
    try {
      await page.waitForFunction(SELECTORS.INSUFFICIENT_PRIVILEGES);
      throw new Error('You do not have access to defer sharing, to enable in scratch, you will need to create a new scratch org with the feature "DeferSharingCalc". In a sandbox/production you will need to contact Salesforce')
    } catch (error) {
      // do nothing
    }

    try {
      await page.waitFor(SELECTORS.SUSPEND_BUTTON);
      await page.waitFor(SELECTORS.RESUME_BUTTON);
    } catch (error) {
      throw new Error('Suspend is not currently available, this could be because you do not have the permission set to allow defer sharing')
    }

    const isSuspendDisabled = await page.$eval(
      SELECTORS.SUSPEND_BUTTON,
      (el: HTMLInputElement) => el.disabled
    );
    const isResumeDisabled = await page.$eval(
      SELECTORS.RESUME_BUTTON,
      (el: HTMLInputElement) => el.disabled
    );
    if (isSuspendDisabled && isResumeDisabled) {
      throw new Error('Sharing recalculation is currently in progress, please wait until this has completed to plan');
    }
    return {
      suspend: isSuspendDisabled
    };
  }

  public async apply(config) {
    const page = await this.browserforce.openPage(PATHS.BASE);
    const button = config.suspend ? SELECTORS.SUSPEND_BUTTON : SELECTORS.RESUME_BUTTON;
    await page.waitFor(button);
    await page.click(button);
    if (!config.suspend) {
      const refreshedPage = await this.browserforce.openPage(PATHS.BASE);
      await refreshedPage.click(SELECTORS.RECALCULATE_BUTTON);
    }
  }
}
