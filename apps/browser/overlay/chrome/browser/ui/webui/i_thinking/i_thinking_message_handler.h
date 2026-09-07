// Copyright 2026 The i-thinking Authors. All rights reserved.
// chrome.send handlers for chrome://i-thinking (MVP stubs).

#ifndef CHROME_BROWSER_UI_WEBUI_I_THINKING_I_THINKING_MESSAGE_HANDLER_H_
#define CHROME_BROWSER_UI_WEBUI_I_THINKING_I_THINKING_MESSAGE_HANDLER_H_

#include "base/values.h"
#include "content/public/browser/web_ui_message_handler.h"

class IThinkingMessageHandler : public content::WebUIMessageHandler {
 public:
  IThinkingMessageHandler();
  IThinkingMessageHandler(const IThinkingMessageHandler&) = delete;
  IThinkingMessageHandler& operator=(const IThinkingMessageHandler&) = delete;
  ~IThinkingMessageHandler() override;

  void RegisterMessages() override;

 private:
  void HandleOpenTab(const base::ListValue& args);
  void HandleSidecarToRead(const base::ListValue& args);
};

#endif  // CHROME_BROWSER_UI_WEBUI_I_THINKING_I_THINKING_MESSAGE_HANDLER_H_
