//! 单一世代迁移：一次性建出当前全部业务表。
//!
//! 项目处于开发期，迁移只保留这一代；`up` 会先整体清掉业务表再重建，
//! 因此改 schema 时直接改本文件即可（无需追加新版本）。

use sea_orm_migration::{prelude::*, schema::*};

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "000001_20260819"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // 整体重建：按依赖倒序清掉全部业务表（含外键级联）
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    // outbox / consumed_event 无外键，先清即可
                    .table(Outbox::Table)
                    .table(ConsumedEvent::Table)
                    .table(SsoConnection::Table)
                    .table(PaymentOrder::Table)
                    .table(Subscription::Table)
                    .table(GatewayAudit::Table)
                    .table(GatewayUsage::Table)
                    .table(GatewayModel::Table)
                    .table(GatewayProvider::Table)
                    .table(TenantMember::Table)
                    .table(Tenant::Table)
                    .table(Chunk::Table)
                    .table(Asset::Table)
                    .table(Auth::Table)
                    .cascade()
                    .to_owned(),
            )
            .await?;

        // ---------- auth ----------
        manager
            .create_table(
                Table::create()
                    .table(Auth::Table)
                    .if_not_exists()
                    .col(pk_uuid(Auth::Id))
                    .col(text_uniq(Auth::Username))
                    .col(text(Auth::Password))
                    .col(text_null(Auth::Email))
                    .col(text_null(Auth::Phone))
                    .col(integer_null(Auth::Age))
                    .col(text_null(Auth::Gender))
                    .col(date_null(Auth::Birthday))
                    .col(uuid_null(Auth::Avatar))
                    .col(text(Auth::Role).default("USER"))
                    .col(text(Auth::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(Auth::ArchivedAt))
                    .col(timestamp_with_time_zone(Auth::CreatedAt))
                    .col(uuid_null(Auth::Creator))
                    .col(timestamp_with_time_zone(Auth::UpdatedAt))
                    .col(uuid_null(Auth::Updater))
                    .col(timestamp_with_time_zone_null(Auth::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_auth_creator")
                            .from(Auth::Table, Auth::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_auth_updater")
                            .from(Auth::Table, Auth::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ---------- asset ----------
        manager
            .create_table(
                Table::create()
                    .table(Asset::Table)
                    .if_not_exists()
                    .col(pk_uuid(Asset::Id))
                    .col(text_null(Asset::TenantId))
                    .col(text_null(Asset::Kind))
                    .col(text(Asset::Hash))
                    .col(text_null(Asset::Sha))
                    .col(big_integer(Asset::Size))
                    .col(big_integer(Asset::Index).default(0))
                    .col(text(Asset::Mime))
                    .col(text_null(Asset::Extension))
                    .col(text(Asset::Name))
                    .col(text(Asset::Status))
                    .col(text(Asset::Visibility).default("PRIVATE"))
                    .col(json_binary_null(Asset::Viewers))
                    .col(integer(Asset::Chunk))
                    .col(integer(Asset::Total))
                    .col(timestamp_with_time_zone_null(Asset::ArchivedAt))
                    .col(timestamp_with_time_zone(Asset::CreatedAt))
                    .col(uuid_null(Asset::Creator))
                    .col(timestamp_with_time_zone(Asset::UpdatedAt))
                    .col(uuid_null(Asset::Updater))
                    .col(timestamp_with_time_zone_null(Asset::ExpiresAt))
                    .col(uuid_null(Asset::Superseded))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_asset_creator")
                            .from(Asset::Table, Asset::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_asset_updater")
                            .from(Asset::Table, Asset::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ---------- chunk ----------
        manager
            .create_table(
                Table::create()
                    .table(Chunk::Table)
                    .if_not_exists()
                    .col(pk_uuid(Chunk::Id))
                    .col(uuid(Chunk::AssetId))
                    .col(integer(Chunk::Index))
                    .col(text(Chunk::Hash))
                    .col(big_integer(Chunk::Size))
                    .col(timestamp_with_time_zone(Chunk::CreatedAt))
                    .col(uuid_null(Chunk::Creator))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_chunk_asset")
                            .from(Chunk::Table, Chunk::AssetId)
                            .to(Asset::Table, Asset::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_chunk_creator")
                            .from(Chunk::Table, Chunk::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_hash")
                    .table(Asset::Table)
                    .col(Asset::Hash)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_tenant_id")
                    .table(Asset::Table)
                    .col(Asset::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_asset_creator")
                    .table(Asset::Table)
                    .col(Asset::Creator)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("uidx_chunk_asset_index")
                    .table(Chunk::Table)
                    .col(Chunk::AssetId)
                    .col(Chunk::Index)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_chunk_hash")
                    .table(Chunk::Table)
                    .col(Chunk::Hash)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_auth_phone")
                    .table(Auth::Table)
                    .col(Auth::Phone)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // auth ↔ asset 互相引用，故外键在两张表建好后再补
        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_auth_avatar")
                    .from(Auth::Table, Auth::Avatar)
                    .to(Asset::Table, Asset::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .on_update(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        manager
            .create_foreign_key(
                ForeignKey::create()
                    .name("fk_asset_superseded")
                    .from(Asset::Table, Asset::Superseded)
                    .to(Asset::Table, Asset::Id)
                    .on_delete(ForeignKeyAction::SetNull)
                    .on_update(ForeignKeyAction::Cascade)
                    .to_owned(),
            )
            .await?;

        // ---------- tenant ----------
        // 配额不落库：由「订阅档位 / 免费档 / 全局兜底」表达，见 gateway 模块。
        manager
            .create_table(
                Table::create()
                    .table(Tenant::Table)
                    .if_not_exists()
                    .col(pk_uuid(Tenant::Id))
                    .col(text(Tenant::Name))
                    .col(text_uniq(Tenant::Slug))
                    .col(text(Tenant::Status).default("ACTIVE"))
                    // PERSONAL（个人，走免费/订阅档位）/ TEAM（团队，走全局兜底）
                    .col(text(Tenant::Type).default("PERSONAL"))
                    .col(timestamp_with_time_zone_null(Tenant::ArchivedAt))
                    .col(timestamp_with_time_zone(Tenant::CreatedAt))
                    .col(uuid_null(Tenant::Creator))
                    .col(timestamp_with_time_zone(Tenant::UpdatedAt))
                    .col(uuid_null(Tenant::Updater))
                    .col(timestamp_with_time_zone_null(Tenant::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_creator")
                            .from(Tenant::Table, Tenant::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_updater")
                            .from(Tenant::Table, Tenant::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ---------- tenant_member ----------
        manager
            .create_table(
                Table::create()
                    .table(TenantMember::Table)
                    .if_not_exists()
                    .col(pk_uuid(TenantMember::Id))
                    .col(uuid(TenantMember::TenantId))
                    .col(uuid(TenantMember::UserId))
                    .col(text(TenantMember::Role))
                    .col(text(TenantMember::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(TenantMember::ArchivedAt))
                    .col(timestamp_with_time_zone(TenantMember::CreatedAt))
                    .col(uuid_null(TenantMember::Creator))
                    .col(timestamp_with_time_zone(TenantMember::UpdatedAt))
                    .col(uuid_null(TenantMember::Updater))
                    .col(timestamp_with_time_zone_null(TenantMember::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_member_tenant")
                            .from(TenantMember::Table, TenantMember::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_member_user")
                            .from(TenantMember::Table, TenantMember::UserId)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_member_creator")
                            .from(TenantMember::Table, TenantMember::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_tenant_member_updater")
                            .from(TenantMember::Table, TenantMember::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("uidx_tenant_member")
                    .table(TenantMember::Table)
                    .col(TenantMember::TenantId)
                    .col(TenantMember::UserId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // ---------- subscription ----------
        manager
            .create_table(
                Table::create()
                    .table(Subscription::Table)
                    .if_not_exists()
                    .col(pk_uuid(Subscription::Id))
                    .col(uuid(Subscription::TenantId))
                    .col(text(Subscription::Plan))
                    .col(text(Subscription::Status).default("ACTIVE"))
                    // 到期时间；NULL = 永久有效（生效时间 = createdAt）
                    .col(timestamp_with_time_zone_null(Subscription::ExpiresAt))
                    .col(timestamp_with_time_zone_null(Subscription::ArchivedAt))
                    .col(timestamp_with_time_zone(Subscription::CreatedAt))
                    .col(uuid_null(Subscription::Creator))
                    .col(timestamp_with_time_zone(Subscription::UpdatedAt))
                    .col(uuid_null(Subscription::Updater))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_subscription_tenant")
                            .from(Subscription::Table, Subscription::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_subscription_tenant")
                    .table(Subscription::Table)
                    .col(Subscription::TenantId)
                    .to_owned(),
            )
            .await?;

        // 每个租户同一时刻最多一条 ACTIVE 订阅：业务不变量在 DB 层兜底。
        // SeaORM 的 Index builder 不支持部分索引（WHERE），只能用原始 SQL。
        manager
            .get_connection()
            .execute_unprepared(
                "CREATE UNIQUE INDEX IF NOT EXISTS uidx_subscription_active \
                 ON subscription (\"tenantID\") WHERE status = 'ACTIVE'",
            )
            .await?;

        // ---------- payment_order ----------
        manager
            .create_table(
                Table::create()
                    .table(PaymentOrder::Table)
                    .if_not_exists()
                    .col(pk_uuid(PaymentOrder::Id))
                    .col(text(PaymentOrder::OrderNo))
                    .col(uuid(PaymentOrder::TenantId))
                    .col(uuid(PaymentOrder::UserId))
                    .col(text(PaymentOrder::Plan))
                    .col(text(PaymentOrder::Channel))
                    // 金额（分）：下单时快照，回调核对以此为准
                    .col(big_integer(PaymentOrder::Amount))
                    .col(text(PaymentOrder::Currency).default("CNY"))
                    .col(text(PaymentOrder::Status).default("PENDING"))
                    // 开通时长（天）；NULL = 永久
                    .col(integer_null(PaymentOrder::DurationDays))
                    .col(text_null(PaymentOrder::TransactionId))
                    .col(text_null(PaymentOrder::CodeUrl))
                    .col(uuid_null(PaymentOrder::SubscriptionId))
                    .col(timestamp_with_time_zone_null(PaymentOrder::PaidAt))
                    .col(timestamp_with_time_zone(PaymentOrder::ExpiresAt))
                    .col(text_null(PaymentOrder::Remark))
                    .col(timestamp_with_time_zone_null(PaymentOrder::ArchivedAt))
                    .col(timestamp_with_time_zone(PaymentOrder::CreatedAt))
                    .col(uuid_null(PaymentOrder::Creator))
                    .col(timestamp_with_time_zone(PaymentOrder::UpdatedAt))
                    .col(uuid_null(PaymentOrder::Updater))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_payment_order_tenant")
                            .from(PaymentOrder::Table, PaymentOrder::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_payment_order_user")
                            .from(PaymentOrder::Table, PaymentOrder::UserId)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("uidx_payment_order_no")
                    .table(PaymentOrder::Table)
                    .col(PaymentOrder::OrderNo)
                    .unique()
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_payment_order_tenant")
                    .table(PaymentOrder::Table)
                    .col(PaymentOrder::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_payment_order_status")
                    .table(PaymentOrder::Table)
                    .col(PaymentOrder::Status)
                    .col(PaymentOrder::ExpiresAt)
                    .to_owned(),
            )
            .await?;

        // ---------- gateway ----------
        manager
            .create_table(
                Table::create()
                    .table(GatewayProvider::Table)
                    .if_not_exists()
                    .col(pk_uuid(GatewayProvider::Id))
                    .col(uuid_null(GatewayProvider::TenantId))
                    .col(text(GatewayProvider::Kind))
                    .col(text(GatewayProvider::Name))
                    .col(text(GatewayProvider::BaseUrl))
                    .col(text(GatewayProvider::ApiKeyEnc).default(""))
                    .col(text(GatewayProvider::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(GatewayProvider::ArchivedAt))
                    .col(timestamp_with_time_zone(GatewayProvider::CreatedAt))
                    .col(uuid_null(GatewayProvider::Creator))
                    .col(timestamp_with_time_zone(GatewayProvider::UpdatedAt))
                    .col(uuid_null(GatewayProvider::Updater))
                    .col(timestamp_with_time_zone_null(GatewayProvider::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_provider_creator")
                            .from(GatewayProvider::Table, GatewayProvider::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_provider_updater")
                            .from(GatewayProvider::Table, GatewayProvider::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_provider_tenant")
                    .table(GatewayProvider::Table)
                    .col(GatewayProvider::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(GatewayModel::Table)
                    .if_not_exists()
                    .col(pk_uuid(GatewayModel::Id))
                    .col(uuid(GatewayModel::ProviderId))
                    .col(uuid_null(GatewayModel::TenantId))
                    .col(text(GatewayModel::Name))
                    .col(text(GatewayModel::Label))
                    .col(json_binary_null(GatewayModel::AllowRoles))
                    .col(boolean(GatewayModel::Enabled).default(true))
                    .col(big_integer(GatewayModel::DailyTokenQuota).default(0))
                    .col(json_binary_null(GatewayModel::Capabilities))
                    .col(big_integer_null(GatewayModel::ContextWindow))
                    .col(timestamp_with_time_zone_null(GatewayModel::ArchivedAt))
                    .col(timestamp_with_time_zone(GatewayModel::CreatedAt))
                    .col(uuid_null(GatewayModel::Creator))
                    .col(timestamp_with_time_zone(GatewayModel::UpdatedAt))
                    .col(uuid_null(GatewayModel::Updater))
                    .col(timestamp_with_time_zone_null(GatewayModel::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_model_provider")
                            .from(GatewayModel::Table, GatewayModel::ProviderId)
                            .to(GatewayProvider::Table, GatewayProvider::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_model_creator")
                            .from(GatewayModel::Table, GatewayModel::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_gateway_model_updater")
                            .from(GatewayModel::Table, GatewayModel::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_model_tenant")
                    .table(GatewayModel::Table)
                    .col(GatewayModel::TenantId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(GatewayUsage::Table)
                    .if_not_exists()
                    .col(pk_uuid(GatewayUsage::Id))
                    .col(uuid_null(GatewayUsage::TenantId))
                    .col(uuid(GatewayUsage::UserId))
                    .col(uuid(GatewayUsage::ProviderId))
                    .col(uuid(GatewayUsage::ModelId))
                    .col(big_integer(GatewayUsage::PromptTokens).default(0))
                    .col(big_integer(GatewayUsage::CompletionTokens).default(0))
                    .col(big_integer(GatewayUsage::TotalTokens).default(0))
                    .col(text(GatewayUsage::Status))
                    .col(big_integer(GatewayUsage::LatencyMs).default(0))
                    .col(timestamp_with_time_zone(GatewayUsage::CreatedAt))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_usage_user")
                    .table(GatewayUsage::Table)
                    .col(GatewayUsage::UserId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_usage_model")
                    .table(GatewayUsage::Table)
                    .col(GatewayUsage::ModelId)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_usage_created")
                    .table(GatewayUsage::Table)
                    .col(GatewayUsage::CreatedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(GatewayAudit::Table)
                    .if_not_exists()
                    .col(pk_uuid(GatewayAudit::Id))
                    .col(uuid_null(GatewayAudit::TenantId))
                    .col(uuid(GatewayAudit::Actor))
                    .col(text(GatewayAudit::Action))
                    .col(text(GatewayAudit::Resource))
                    .col(json_binary_null(GatewayAudit::Detail))
                    .col(text_null(GatewayAudit::Ip))
                    .col(timestamp_with_time_zone(GatewayAudit::CreatedAt))
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_audit_actor")
                    .table(GatewayAudit::Table)
                    .col(GatewayAudit::Actor)
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_gateway_audit_created")
                    .table(GatewayAudit::Table)
                    .col(GatewayAudit::CreatedAt)
                    .to_owned(),
            )
            .await?;

        // ---------- sso_connection ----------
        manager
            .create_table(
                Table::create()
                    .table(SsoConnection::Table)
                    .if_not_exists()
                    .col(pk_uuid(SsoConnection::Id))
                    .col(uuid(SsoConnection::TenantId))
                    .col(text(SsoConnection::Provider))
                    .col(text(SsoConnection::Issuer))
                    .col(text(SsoConnection::ClientId))
                    .col(text(SsoConnection::ClientSecretEnc).default(""))
                    .col(text(SsoConnection::RedirectUri))
                    .col(text(SsoConnection::Status).default("ACTIVE"))
                    .col(timestamp_with_time_zone_null(SsoConnection::ArchivedAt))
                    .col(timestamp_with_time_zone(SsoConnection::CreatedAt))
                    .col(uuid_null(SsoConnection::Creator))
                    .col(timestamp_with_time_zone(SsoConnection::UpdatedAt))
                    .col(uuid_null(SsoConnection::Updater))
                    .col(timestamp_with_time_zone_null(SsoConnection::ExpiresAt))
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sso_connection_tenant")
                            .from(SsoConnection::Table, SsoConnection::TenantId)
                            .to(Tenant::Table, Tenant::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sso_connection_creator")
                            .from(SsoConnection::Table, SsoConnection::Creator)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk_sso_connection_updater")
                            .from(SsoConnection::Table, SsoConnection::Updater)
                            .to(Auth::Table, Auth::Id)
                            .on_delete(ForeignKeyAction::SetNull)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // ---------- outbox（事务性发件箱） ----------
        // 与聚合变更同事务写入，P4 的发布器只搬运、不判定业务；写入方是业务事务，读取方是特权连接。
        manager
            .create_table(
                Table::create()
                    .table(Outbox::Table)
                    .if_not_exists()
                    .col(pk_uuid(Outbox::Id))
                    // 单调递增序号：给消费者全局全序（时间戳会因时钟回拨产生并列）
                    .col(big_integer(Outbox::Seq).auto_increment())
                    // 聚合名（如 "subscription"），配合 aggregateID 构成分区键
                    .col(text(Outbox::Aggregate))
                    .col(uuid(Outbox::AggregateId))
                    // 不可变过去式事件名（如 "subscription.renewed"）
                    .col(text(Outbox::EventType))
                    .col(integer(Outbox::SchemaVersion))
                    .col(json_binary(Outbox::Payload))
                    .col(text_null(Outbox::Traceparent))
                    .col(uuid_null(Outbox::TenantId))
                    .col(timestamp_with_time_zone(Outbox::CreatedAt))
                    .col(timestamp_with_time_zone_null(Outbox::PublishedAt))
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_outbox_unpublished")
                    .table(Outbox::Table)
                    .col(Outbox::Seq)
                    .and_where(Expr::col(Outbox::PublishedAt).is_null())
                    .to_owned(),
            )
            .await?;
        manager
            .create_index(
                Index::create()
                    .if_not_exists()
                    .name("idx_outbox_aggregate")
                    .table(Outbox::Table)
                    .col(Outbox::Aggregate)
                    .col(Outbox::AggregateId)
                    .col(Outbox::Seq)
                    .to_owned(),
            )
            .await?;

        // ---------- consumed_event（消费幂等去重） ----------
        manager
            .create_table(
                Table::create()
                    .table(ConsumedEvent::Table)
                    .if_not_exists()
                    // 消费者标识（服务名/进程组），与 eventID 一起构成幂等键
                    .col(text(ConsumedEvent::Consumer))
                    .col(uuid(ConsumedEvent::EventId))
                    .col(timestamp_with_time_zone(ConsumedEvent::ConsumedAt))
                    .primary_key(
                        Index::create()
                            .name("pk_consumed_event")
                            .col(ConsumedEvent::Consumer)
                            .col(ConsumedEvent::EventId),
                    )
                    .to_owned(),
            )
            .await?;

        // ---------- 租户隔离（RLS） ----------
        // 隔离从"调用约定"下沉为数据库机制：应用角色即便漏传条件也拿不到别人的行。
        for (function, setting) in [
            ("app_current_tenant_id", TENANT_SETTING),
            ("app_current_user_id", USER_SETTING),
        ] {
            manager
                .get_connection()
                .execute_unprepared(&scope_reader(function, setting))
                .await?;
        }

        // 严格隔离：只见本租户行；"tenantID" 为 NULL 的行不属于任何租户作用域
        for table in STRICT_TENANT_TABLES {
            enable_rls(
                manager,
                table,
                r#""tenantID" = app_current_tenant_id()"#,
                r#""tenantID" = app_current_tenant_id()"#,
            )
            .await?;
        }

        // 用量与审计允许落在**没有租户**的账号上：新账号尚未建租户时走全局配额，
        // 这些行的 "tenantID" 为 NULL，严格租户策略下既读不到也写不进。
        // 因此额外放开「自己那一份」：`"tenantID" IS NULL` 且行归属当前账号（`userID` / `actor`）。
        // 两个方向都只放宽到本人：别人的无租户行照旧不可见、不可写，租户作用域也看不到它们。
        for (table, owner_column) in [
            ("gateway_usage", r#""userID""#),
            ("gateway_audit", r#""actor""#),
        ] {
            let clause = format!(
                r#""tenantID" = app_current_tenant_id()
                   OR ("tenantID" IS NULL AND {owner_column} = app_current_user_id())"#
            );
            enable_rls(manager, table, &clause, &clause).await?;
        }

        // 订单表在严格隔离之上多一条**能力键**分支：支付渠道回调是匿名端点，没有会话，
        // 只有一个由渠道回传、等价于一次性凭证的订单号，因此必须先用订单号反解出租户。
        // 该分支只放宽 `USING`（且只放行那一行**未归档**订单的可见性），`WITH CHECK` 仍是租户限定：
        // 拿到订单号也写不进任何一行，写入照旧必须先建立租户作用域。
        // 反解不到（订单号未知 / 已归档 / 变量未设置）时 `current_setting(..., true)` 为 NULL，
        // 条件恒不成立——fail-closed。
        let payment_order_using = format!(
            r#""tenantID" = app_current_tenant_id()
               OR ("orderNo" = current_setting('{ORDER_SETTING}', true) AND "archivedAt" IS NULL)"#
        );
        enable_rls(
            manager,
            "payment_order",
            &payment_order_using,
            r#""tenantID" = app_current_tenant_id()"#,
        )
        .await?;

        // 成员关系额外允许"只读自己"：未进入任何租户时，账号作用域仍能列出自己的成员关系
        // （`/tenants` 需要它）；写入一律要求租户作用域。
        enable_rls(
            manager,
            "tenant_member",
            r#""tenantID" = app_current_tenant_id() OR "userID" = app_current_user_id()"#,
            r#""tenantID" = app_current_tenant_id()"#,
        )
        .await?;

        // asset."tenantID" 是 text（历史列型），比较时显式转型
        enable_rls(
            manager,
            "asset",
            r#""tenantID" = app_current_tenant_id()::text"#,
            r#""tenantID" = app_current_tenant_id()::text"#,
        )
        .await?;

        // 全局目录：内置行（"tenantID" IS NULL）对所有租户可见；WITH CHECK 只放行本租户行，
        // 应用角色因此无法在租户作用域内新建全局行（全局行的写入属于特权连接）
        for table in ["gateway_provider", "gateway_model"] {
            enable_rls(
                manager,
                table,
                r#""tenantID" IS NULL OR "tenantID" = app_current_tenant_id()"#,
                r#""tenantID" = app_current_tenant_id()"#,
            )
            .await?;
        }

        // tenant 自身按主键隔离：只能读写自己那一行；新建租户时作用域就是新租户 id，
        // 因此插入能自洽通过 WITH CHECK（创建者随后在同一事务里补上 OWNER 成员行）。
        // 额外允许"只读自己加入的租户"：账号作用域下可按 id 读回自己的租户行（列表页需要）。
        enable_rls(
            manager,
            "tenant",
            r#"id = app_current_tenant_id()
               OR id IN (
                   SELECT "tenantID" FROM tenant_member
                   WHERE "userID" = app_current_user_id() AND status = 'ACTIVE'
               )"#,
            "id = app_current_tenant_id()",
        )
        .await?;

        // 特权通道的角色也在这里就位（超级用户迁移账号下自建；否则只告警）
        ensure_platform_role(manager).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .if_exists()
                    .table(Outbox::Table)
                    .table(ConsumedEvent::Table)
                    .table(SsoConnection::Table)
                    .table(PaymentOrder::Table)
                    .table(Subscription::Table)
                    .table(GatewayAudit::Table)
                    .table(GatewayUsage::Table)
                    .table(GatewayModel::Table)
                    .table(GatewayProvider::Table)
                    .table(TenantMember::Table)
                    .table(Tenant::Table)
                    .table(Chunk::Table)
                    .table(Asset::Table)
                    .table(Auth::Table)
                    .cascade()
                    .to_owned(),
            )
            .await?;
        Ok(())
    }
}

/// 会话级作用域变量名。
///
/// 必须与 `service::databases::scope` 的常量一致（迁移 crate 不能依赖 service）；
/// 两边一旦漂移，隔离用例会立刻失败。
const TENANT_SETTING: &str = "app.tenant_id";
const USER_SETTING: &str = "app.user_id";
/// 支付回调的能力键（订单号）作用域变量：只被 `payment_order` 的只读分支识别。
const ORDER_SETTING: &str = "app.order_no";
/// 平台运维角色：唯一一条绕过行级策略的通道。
///
/// 必须与 `service::databases::scope::PLATFORM_ROLE` 一致（迁移 crate 不能依赖 service）。
const PLATFORM_ROLE: &str = "core_platform";

/// 作用域的读取器：未设置或不是合法 uuid 时一律返回 `NULL`（fail-closed）。
///
/// `STABLE` 保证同语句内多次引用只求值一次，并允许调用方在事务内用
/// `set_config('<setting>', $1, true)` 设定作用域。
fn scope_reader(function: &str, setting: &str) -> String {
    format!(
        r#"CREATE OR REPLACE FUNCTION {function}() RETURNS uuid
LANGUAGE sql STABLE AS $fn$
    SELECT CASE
        WHEN current_setting('{setting}', true)
             ~ '^[0-9a-fA-F]{{8}}-[0-9a-fA-F]{{4}}-[0-9a-fA-F]{{4}}-[0-9a-fA-F]{{4}}-[0-9a-fA-F]{{12}}$'
        THEN current_setting('{setting}', true)::uuid
        ELSE NULL
    END
$fn$"#
    )
}

/// 严格按 `"tenantID" = app_current_tenant_id()` 隔离的表。
///
/// 不在其中的表都另有分支，见 `up()`：
/// - `tenant_member`："只读自己"（账号作用域下列出自己的成员关系）；
/// - `payment_order`：按订单号（能力键）反解租户的只读分支；
/// - `gateway_usage` / `gateway_audit`：无租户行的归属分支（NULL 租户 + 本人）。
const STRICT_TENANT_TABLES: [&str; 3] = ["subscription", "sso_connection", "outbox"];

/// 逐表启用行级安全：`ENABLE` 约束普通角色，`FORCE` 连表属主一起约束，
/// 单角色直连部署下也不会失效；策略用固定名，重跑时可先删后建。
async fn enable_rls(
    manager: &SchemaManager<'_>,
    table: &str,
    using: &str,
    with_check: &str,
) -> Result<(), DbErr> {
    let conn = manager.get_connection();
    // sqlx 扩展协议不接受多语句，逐条执行
    let statements = [
        format!("ALTER TABLE {table} ENABLE ROW LEVEL SECURITY"),
        format!("ALTER TABLE {table} FORCE ROW LEVEL SECURITY"),
        format!("DROP POLICY IF EXISTS tenant_isolation ON {table}"),
        format!(
            "CREATE POLICY tenant_isolation ON {table} USING ({using}) WITH CHECK ({with_check})"
        ),
    ];
    for statement in statements {
        conn.execute_unprepared(&statement).await?;
    }
    Ok(())
}

/// 就位平台运维角色（`BYPASSRLS` 只能由超级用户授予，因此这里是**尽力而为**）。
///
/// 顺序：角色不存在则创建（`NOLOGIN`：只能被 `SET ROLE` 进入，不能独立登录）→
/// 迁移账号还不是它的成员则补授权 → 授予表权限（`SET ROLE` 之后权限判定用的是该角色**自己**的权限）。
/// 任何一步因权限不足失败都只告警：运维面会明确报错，租户面不受影响；
/// 生产环境通常由 DBA 预先执行同样的语句（见 `guide/database.md`）。
async fn ensure_platform_role(manager: &SchemaManager<'_>) -> Result<(), DbErr> {
    let statement = format!(
        r#"DO $do$
BEGIN
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '{PLATFORM_ROLE}') THEN
            EXECUTE 'CREATE ROLE {PLATFORM_ROLE} NOLOGIN BYPASSRLS';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_auth_members m
            JOIN pg_roles r ON r.oid = m.roleid
            WHERE r.rolname = '{PLATFORM_ROLE}'
              AND m.member = (SELECT oid FROM pg_roles WHERE rolname = current_user)
        ) THEN
            EXECUTE format('GRANT {PLATFORM_ROLE} TO %I', current_user);
        END IF;
        EXECUTE 'GRANT USAGE ON SCHEMA public TO {PLATFORM_ROLE}';
        EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO {PLATFORM_ROLE}';
        EXECUTE 'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO {PLATFORM_ROLE}';
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE WARNING '平台角色 {PLATFORM_ROLE} 未就位（权限不足）：运维面不可用，请由超级用户创建该角色并授予应用角色';
    END;
END
$do$"#
    );

    manager
        .get_connection()
        .execute_unprepared(&statement)
        .await?;
    Ok(())
}

#[derive(DeriveIden)]
enum Auth {
    Table,
    Id,
    Username,
    Password,
    Email,
    Phone,
    Age,
    Gender,
    Birthday,
    Avatar,
    Role,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum Asset {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Kind,
    Hash,
    Sha,
    Size,
    Index,
    Mime,
    Extension,
    Name,
    Status,
    Visibility,
    Viewers,
    Chunk,
    Total,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
    Superseded,
}

#[derive(DeriveIden)]
enum Chunk {
    Table,
    Id,
    #[sea_orm(iden = "assetID")]
    AssetId,
    Index,
    Hash,
    Size,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
}

#[derive(DeriveIden)]
enum Tenant {
    Table,
    Id,
    Name,
    Slug,
    Status,
    Type,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum TenantMember {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    #[sea_orm(iden = "userID")]
    UserId,
    Role,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum Subscription {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Plan,
    Status,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
}

#[derive(DeriveIden)]
enum GatewayProvider {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Kind,
    Name,
    #[sea_orm(iden = "baseURL")]
    BaseUrl,
    #[sea_orm(iden = "apiKeyEnc")]
    ApiKeyEnc,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum GatewayModel {
    Table,
    Id,
    #[sea_orm(iden = "providerID")]
    ProviderId,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Name,
    Label,
    #[sea_orm(iden = "allowRoles")]
    AllowRoles,
    Enabled,
    #[sea_orm(iden = "dailyTokenQuota")]
    DailyTokenQuota,
    Capabilities,
    #[sea_orm(iden = "contextWindow")]
    ContextWindow,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum GatewayUsage {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    #[sea_orm(iden = "userID")]
    UserId,
    #[sea_orm(iden = "providerID")]
    ProviderId,
    #[sea_orm(iden = "modelID")]
    ModelId,
    #[sea_orm(iden = "promptTokens")]
    PromptTokens,
    #[sea_orm(iden = "completionTokens")]
    CompletionTokens,
    #[sea_orm(iden = "totalTokens")]
    TotalTokens,
    Status,
    #[sea_orm(iden = "latencyMs")]
    LatencyMs,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
}

#[derive(DeriveIden)]
enum GatewayAudit {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Actor,
    Action,
    Resource,
    Detail,
    Ip,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
}

#[derive(DeriveIden)]
enum SsoConnection {
    Table,
    Id,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    Provider,
    Issuer,
    #[sea_orm(iden = "clientID")]
    ClientId,
    #[sea_orm(iden = "clientSecretEnc")]
    ClientSecretEnc,
    #[sea_orm(iden = "redirectUri")]
    RedirectUri,
    Status,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
}

#[derive(DeriveIden)]
enum PaymentOrder {
    Table,
    Id,
    #[sea_orm(iden = "orderNo")]
    OrderNo,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    #[sea_orm(iden = "userID")]
    UserId,
    Plan,
    Channel,
    Amount,
    Currency,
    Status,
    #[sea_orm(iden = "durationDays")]
    DurationDays,
    #[sea_orm(iden = "transactionID")]
    TransactionId,
    #[sea_orm(iden = "codeUrl")]
    CodeUrl,
    #[sea_orm(iden = "subscriptionID")]
    SubscriptionId,
    #[sea_orm(iden = "paidAt")]
    PaidAt,
    #[sea_orm(iden = "expiresAt")]
    ExpiresAt,
    Remark,
    #[sea_orm(iden = "archivedAt")]
    ArchivedAt,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    Creator,
    #[sea_orm(iden = "updatedAt")]
    UpdatedAt,
    Updater,
}

/// 事务性发件箱：事件是历史事实，不随聚合级联删除，故无外键。
#[derive(DeriveIden)]
enum Outbox {
    Table,
    Id,
    Seq,
    Aggregate,
    #[sea_orm(iden = "aggregateID")]
    AggregateId,
    #[sea_orm(iden = "eventType")]
    EventType,
    #[sea_orm(iden = "schemaVersion")]
    SchemaVersion,
    Payload,
    Traceparent,
    #[sea_orm(iden = "tenantID")]
    TenantId,
    #[sea_orm(iden = "createdAt")]
    CreatedAt,
    #[sea_orm(iden = "publishedAt")]
    PublishedAt,
}

/// 消费幂等去重表：每个消费者对每个事件最多处理一次。
#[derive(DeriveIden)]
enum ConsumedEvent {
    Table,
    Consumer,
    #[sea_orm(iden = "eventID")]
    EventId,
    #[sea_orm(iden = "consumedAt")]
    ConsumedAt,
}
