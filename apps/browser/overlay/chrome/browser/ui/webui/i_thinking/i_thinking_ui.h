// Copyright 2026 The i-thinking Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#ifndef CHROME_BROWSER_UI_WEBUI_I_THINKING_I_THINKING_UI_H_
#define CHROME_BROWSER_UI_WEBUI_I_THINKING_I_THINKING_UI_H_

#include "chrome/common/i_thinking_url_constants.h"
#include "content/public/browser/web_ui_controller.h"
#include "content/public/browser/webui_config.h"

namespace content {
class WebUI;
}  // namespace content

// WebUI controller for chrome://i-thinking.
class IThinkingUI : public content::WebUIController {
 public:
  explicit IThinkingUI(content::WebUI* web_ui);
  IThinkingUI(const IThinkingUI&) = delete;
  IThinkingUI& operator=(const IThinkingUI&) = delete;
  ~IThinkingUI() override;
};

class IThinkingUIConfig : public content::DefaultWebUIConfig<IThinkingUI> {
 public:
  IThinkingUIConfig();
};

#endif  // CHROME_BROWSER_UI_WEBUI_I_THINKING_I_THINKING_UI_H_
