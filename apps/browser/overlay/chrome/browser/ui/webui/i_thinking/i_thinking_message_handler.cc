// Copyright 2026 The i-thinking Authors. All rights reserved.

#include "chrome/browser/ui/webui/i_thinking/i_thinking_message_handler.h"

#include "base/values.h"
#include "chrome/browser/ui/browser_window/public/browser_window_interface.h"
#include "chrome/browser/ui/browser_window/public/global_browser_collection.h"
#include "chrome/browser/ui/navigator/browser_navigator.h"
#include "chrome/browser/ui/navigator/browser_navigator_params.h"
#include "content/public/browser/web_contents.h"
#include "content/public/browser/web_ui.h"
#include "ui/base/page_transition_types.h"
#include "ui/base/window_open_disposition.h"
#include "url/gurl.h"

IThinkingMessageHandler::IThinkingMessageHandler() = default;
IThinkingMessageHandler::~IThinkingMessageHandler() = default;

void IThinkingMessageHandler::RegisterMessages() {
  web_ui()->RegisterMessageCallback(
      "openTab",
      base::BindRepeating(&IThinkingMessageHandler::HandleOpenTab,
                          base::Unretained(this)));
  web_ui()->RegisterMessageCallback(
      "sidecar.toRead",
      base::BindRepeating(&IThinkingMessageHandler::HandleSidecarToRead,
                          base::Unretained(this)));
}

void IThinkingMessageHandler::HandleOpenTab(const base::ListValue& args) {
  if (args.empty() || !args[0].is_string()) {
    return;
  }
  const GURL url(args[0].GetString());
  if (!url.is_valid() ||
      !(url.SchemeIsHTTPOrHTTPS() || url.SchemeIs("chrome"))) {
    return;
  }

  BrowserWindowInterface* browser =
      GlobalBrowserCollection::GetInstance()->FindBrowserWithTab(
          web_ui()->GetWebContents());
  if (!browser) {
    return;
  }

  NavigateParams params(browser, url, ui::PAGE_TRANSITION_LINK);
  params.disposition = WindowOpenDisposition::NEW_FOREGROUND_TAB;
  Navigate(&params);
}

void IThinkingMessageHandler::HandleSidecarToRead(
    const base::ListValue& args) {
  // MVP: reply with empty status via ResolveJavascriptCallback when wired.
  // Sidecar spawn lands in a follow-up (browser process host).
  (void)args;
}
