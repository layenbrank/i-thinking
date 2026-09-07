import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { writeUtf8NoBom } from '../infra/fs.ts'
import type { WireStep } from '../types.ts'
import { readText, replaceOnce } from './text.ts'

const SEARCH_CC = path.join('chrome', 'browser', 'search', 'search.cc')
const TABSTRIP_CC = path.join('chrome', 'browser', 'ui', 'browser_tabstrip.cc')

const INCLUDE_LINE = '#include "chrome/common/i_thinking_url_constants.h"'

const FOR_PROFILE_OLD = `  static NewTabURLDetails ForProfile(Profile* profile) {
    // Incognito and Guest profiles have their own New Tab.
    // This function may also be called by other off-the-record profiles that
    // can exceptionally open a browser window.
    // See OTRProfileID::AllowsBrowserWindows() for more context.
    if (profile->IsOffTheRecord()) {
      return NewTabURLDetails(GURL(), NEW_TAB_URL_INCOGNITO);
    }

#if BUILDFLAG(IS_ANDROID)
    const GURL local_url;
#else
    const bool default_is_google = DefaultSearchProviderIsGoogle(profile);
    const GURL local_url(default_is_google
                             ? chrome::ChromeUINewTabPageURLAsGURL()
                             : GURL(chrome::kChromeUINewTabPageThirdPartyURL));
    if (default_is_google) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_VALID);
    }
#endif

    const TemplateURL* template_url =
        GetDefaultSearchProviderTemplateURL(profile);
    if (!profile || !template_url) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_BAD);
    }

    GURL search_provider_url(template_url->new_tab_url_ref().ReplaceSearchTerms(
        TemplateURLRef::SearchTermsArgs(std::u16string()),
        UIThreadSearchTermsData()));

    if (!search_provider_url.is_valid()) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_NOT_SET);
    }
    if (!search_provider_url.SchemeIsCryptographic()) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_INSECURE);
    }
    if (!IsURLAllowedForSupervisedUser(search_provider_url,
                                       CHECK_DEREF(profile))) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_BLOCKED);
    }

    return NewTabURLDetails(search_provider_url, NEW_TAB_URL_VALID);
  }`

const FOR_PROFILE_NEW = `  static NewTabURLDetails ForProfile(Profile* profile) {
    // Incognito and Guest profiles have their own New Tab.
    // This function may also be called by other off-the-record profiles that
    // can exceptionally open a browser window.
    // See OTRProfileID::AllowsBrowserWindows() for more context.
    if (profile->IsOffTheRecord()) {
      return NewTabURLDetails(GURL(), NEW_TAB_URL_INCOGNITO);
    }

#if BUILDFLAG(IS_ANDROID)
    const GURL local_url;

    const TemplateURL* template_url =
        GetDefaultSearchProviderTemplateURL(profile);
    if (!profile || !template_url) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_BAD);
    }

    GURL search_provider_url(template_url->new_tab_url_ref().ReplaceSearchTerms(
        TemplateURLRef::SearchTermsArgs(std::u16string()),
        UIThreadSearchTermsData()));

    if (!search_provider_url.is_valid()) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_NOT_SET);
    }
    if (!search_provider_url.SchemeIsCryptographic()) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_INSECURE);
    }
    if (!IsURLAllowedForSupervisedUser(search_provider_url,
                                       CHECK_DEREF(profile))) {
      return NewTabURLDetails(local_url, NEW_TAB_URL_BLOCKED);
    }

    return NewTabURLDetails(search_provider_url, NEW_TAB_URL_VALID);
#else
    // i-thinking: default NTP fallback only. chrome://newtab is still opened
    // first so policy / extension chrome_url_overrides.newtab win when present.
    return NewTabURLDetails(GURL(chrome::kChromeUIIThinkingURL),
                            NEW_TAB_URL_VALID);
#endif
  }`

const REVERSE_OLD = `  if (IsInstantNTPURL(*url, profile)) {
    *url = chrome::ChromeUINewTabURLAsGURL();
    return true;
  }`

const REVERSE_NEW = `  if (IsInstantNTPURL(*url, profile)) {
    // Keep chrome://i-thinking/ visible (do not reverse to chrome://newtab).
    if (url->host() == chrome::kChromeUIIThinkingHost) {
      return false;
    }
    *url = chrome::ChromeUINewTabURLAsGURL();
    return true;
  }`

/** Old aggressive patch: GetNewTabURL returned i-thinking and bypassed extensions. */
const GET_NTP_FN_AGGRESSIVE = `GURL GetNewTabURL(const BrowserWindowInterface* browser) {
  if (browser) {
    if (auto* const app_browser_controller =
            web_app::AppBrowserController::From(browser)) {
      return app_browser_controller->GetAppNewTabUrl();
    }
  }
  return GURL(chrome::kChromeUIIThinkingURL);
}`

const GET_NTP_FN_COMPAT = `GURL GetNewTabURL(const BrowserWindowInterface* browser) {
  if (browser) {
    if (auto* const app_browser_controller =
            web_app::AppBrowserController::From(browser)) {
      return app_browser_controller->GetAppNewTabUrl();
    }
  }
  // Keep chrome://newtab so policy / extension NTP overrides still apply.
  // Product default is applied later in search::HandleNewTabURLRewrite.
  return ChromeUINewTabURLAsGURL();
}`

function ensureInclude(filePath: string): void {
  const text = readText(filePath)
  if (text.includes('i_thinking_url_constants.h')) {
    return
  }
  if (text.includes('#include "chrome/common/url_constants.h"')) {
    replaceOnce(
      filePath,
      '#include "chrome/common/url_constants.h"',
      `#include "chrome/common/url_constants.h"\n${INCLUDE_LINE}`
    )
    return
  }
  if (text.includes('#include "chrome/common/webui_url_constants.h"')) {
    replaceOnce(
      filePath,
      '#include "chrome/common/webui_url_constants.h"',
      `#include "chrome/common/webui_url_constants.h"\n${INCLUDE_LINE}`
    )
    return
  }
  logger.warn(`[wire] WARN: add ${INCLUDE_LINE} to ${filePath} manually`)
}

const NewTabPageStep: WireStep = {
  id: 'new-tab-page',
  description: '默认 NTP fallback 为 chrome://i-thinking/（兼容扩展覆盖）',
  apply(ctx) {
    const searchPath = path.join(ctx.chromiumRoot, SEARCH_CC)
    if (!existsSync(searchPath)) {
      logger.warn(`[wire] SKIP missing ${searchPath}`)
      return
    }

    ensureInclude(searchPath)
    let search = readText(searchPath)
    if (
      search.includes('product home is the New Tab Page') ||
      search.includes('default NTP fallback only')
    ) {
      logger.info('[wire] OK search.cc already uses i-thinking NTP fallback')
    } else if (search.includes(FOR_PROFILE_OLD)) {
      search = search.replace(FOR_PROFILE_OLD, FOR_PROFILE_NEW)
      writeUtf8NoBom(searchPath, search)
      logger.success('[wire] PATCHED NewTabURLDetails::ForProfile -> i-thinking fallback')
    } else {
      logger.warn('[wire] WARN: ForProfile block not found; patch search.cc manually')
    }

    // Refresh comment if older product-home wording remains without fallback note.
    search = readText(searchPath)
    if (
      search.includes('product home is the New Tab Page') &&
      !search.includes('default NTP fallback only')
    ) {
      search = search.replace(
        '    // i-thinking: product home is the New Tab Page.\n',
        `    // i-thinking: default NTP fallback only. chrome://newtab is still opened
    // first so policy / extension chrome_url_overrides.newtab win when present.
`
      )
      writeUtf8NoBom(searchPath, search)
    }

    search = readText(searchPath)
    if (search.includes('kChromeUIIThinkingHost')) {
      logger.info('[wire] OK reverse rewrite already preserves i-thinking')
    } else if (search.includes(REVERSE_OLD)) {
      search = search.replace(REVERSE_OLD, REVERSE_NEW)
      writeUtf8NoBom(searchPath, search)
      logger.success('[wire] PATCHED HandleNewTabURLReverseRewrite')
    } else {
      logger.warn('[wire] WARN: reverse rewrite block not found')
    }

    // Desktop NTP no longer uses these helpers; guard to avoid -Wunused-function.
    search = readText(searchPath)
    if (
      !search.includes(
        '#if BUILDFLAG(IS_ANDROID)\nconst TemplateURL* GetDefaultSearchProviderTemplateURL'
      )
    ) {
      const helperOld = `const TemplateURL* GetDefaultSearchProviderTemplateURL(Profile* profile) {`
      if (search.includes(helperOld)) {
        search = search.replace(
          helperOld,
          `#if BUILDFLAG(IS_ANDROID)\nconst TemplateURL* GetDefaultSearchProviderTemplateURL(Profile* profile) {`
        )
        search = search.replace(
          `  return nullptr;
}

bool IsMatchingServiceWorker`,
          `  return nullptr;
}
#endif

bool IsMatchingServiceWorker`
        )
        writeUtf8NoBom(searchPath, search)
        logger.success('[wire] Guarded GetDefaultSearchProviderTemplateURL for Android')
      }
    }

    search = readText(searchPath)
    if (
      !search.includes('#if BUILDFLAG(IS_ANDROID)\nbool IsURLAllowedForSupervisedUser')
    ) {
      const suOld = `bool IsURLAllowedForSupervisedUser(const GURL& url, Profile& profile) {`
      if (search.includes(suOld)) {
        search = search.replace(
          suOld,
          `#if BUILDFLAG(IS_ANDROID)\nbool IsURLAllowedForSupervisedUser(const GURL& url, Profile& profile) {`
        )
        search = search.replace(
          `  return true;
}

// Used to look up the URL to use for the New Tab page.`,
          `  return true;
}
#endif

// Used to look up the URL to use for the New Tab page.`
        )
        writeUtf8NoBom(searchPath, search)
        logger.success('[wire] Guarded IsURLAllowedForSupervisedUser for Android')
      }
    }

    // GetNewTabURL must stay chrome://newtab (extension-compatible).
    const tabPath = path.join(ctx.chromiumRoot, TABSTRIP_CC)
    if (!existsSync(tabPath)) {
      logger.warn(`[wire] SKIP missing ${tabPath}`)
      return
    }

    let tab = readText(tabPath)
    if (tab.includes(GET_NTP_FN_AGGRESSIVE)) {
      tab = tab.replace(GET_NTP_FN_AGGRESSIVE, GET_NTP_FN_COMPAT)
      writeUtf8NoBom(tabPath, tab)
      logger.success('[wire] RESTORED GetNewTabURL -> chrome://newtab (extension-safe)')
      return
    }
    if (tab.includes('ChromeUINewTabURLAsGURL()')) {
      logger.info('[wire] OK GetNewTabURL still returns chrome://newtab')
      return
    }
    logger.warn('[wire] WARN: GetNewTabURL shape unexpected; verify manually')
  }
}

export { NewTabPageStep }
