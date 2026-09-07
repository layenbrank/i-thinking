// Copyright 2026 The i-thinking Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "chrome/browser/ui/webui/i_thinking/i_thinking_ui.h"

#include <memory>
#include <string>
#include <utility>

#include "base/command_line.h"
#include "base/memory/ref_counted_memory.h"
#include "base/strings/stringprintf.h"
#include "chrome/browser/ui/webui/i_thinking/i_thinking_message_handler.h"
#include "chrome/common/i_thinking_url_constants.h"
#include "chrome/grit/i_thinking_resources.h"
#include "chrome/grit/i_thinking_resources_map.h"
#include "content/public/browser/web_contents.h"
#include "content/public/browser/web_ui.h"
#include "content/public/browser/web_ui_data_source.h"
#include "content/public/common/url_constants.h"
#include "services/network/public/mojom/content_security_policy.mojom.h"
#include "ui/webui/webui_util.h"

namespace {

// Dev override: --load-i-thinking-from-http=http://127.0.0.1:5173/
constexpr char kLoadIThinkingFromHttpSwitch[] = "load-i-thinking-from-http";

std::string BuildHttpRedirectHtml(const std::string& http_url) {
  return base::StringPrintf(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\">"
      "<meta http-equiv=\"refresh\" content=\"0;url=%s\">"
      "<script>location.replace(\"%s\");</script>"
      "</head><body></body></html>",
      http_url.c_str(), http_url.c_str());
}

void CreateAndAddIThinkingDataSource(content::WebUI* web_ui) {
  content::WebUIDataSource* source = content::WebUIDataSource::CreateAndAdd(
      web_ui->GetWebContents()->GetBrowserContext(),
      chrome::kChromeUIIThinkingHost);

  // grit IDs (IDR_I_THINKING_*) are generated from
  // chrome/browser/resources/i_thinking/ via grit in BUILD.gn.
  webui::SetupWebUIDataSource(source, kIThinkingResources,
                              IDR_I_THINKING_INDEX_HTML);

  source->AddString("version", "0.1.0-dev");
  source->AddString("productName", "i-thinking");
  // SetDefaultResource is applied inside SetupWebUIDataSource via
  // IDR_I_THINKING_INDEX_HTML; keep that as the production default.

  // Vite/React/antd assign Element.innerHTML; SetupWebUIDataSource enables
  // require-trusted-types-for with Lit policies, which breaks React.
  source->DisableTrustedTypesCSP();
  source->OverrideContentSecurityPolicy(
      network::mojom::CSPDirectiveName::ScriptSrc,
      "script-src chrome://resources chrome://webui-test 'self';");

  const base::CommandLine* command_line =
      base::CommandLine::ForCurrentProcess();
  if (command_line->HasSwitch(kLoadIThinkingFromHttpSwitch)) {
    const std::string http_url =
        command_line->GetSwitchValueASCII(kLoadIThinkingFromHttpSwitch);
    // MVP: serve a redirect HTML for the default document so a local HTTP
    // bundler can drive chrome://i-thinking during UI development.
    const std::string redirect_html = BuildHttpRedirectHtml(http_url);
    source->SetRequestFilter(
        base::BindRepeating([](const std::string& path) {
          return path.empty() || path == "index.html" ||
                 path == "i_thinking.html";
        }),
        base::BindRepeating(
            [](const std::string& redirect_html, const std::string& path,
               content::WebUIDataSource::GotDataCallback callback) {
              std::string html = redirect_html;
              std::move(callback).Run(
                  base::MakeRefCounted<base::RefCountedString>(std::move(html)));
            },
            redirect_html));
  }
}

}  // namespace

IThinkingUIConfig::IThinkingUIConfig()
    : DefaultWebUIConfig(content::kChromeUIScheme,
                         chrome::kChromeUIIThinkingHost) {}

IThinkingUI::IThinkingUI(content::WebUI* web_ui) : WebUIController(web_ui) {
  CreateAndAddIThinkingDataSource(web_ui);
  web_ui->AddMessageHandler(std::make_unique<IThinkingMessageHandler>());
}

IThinkingUI::~IThinkingUI() = default;
