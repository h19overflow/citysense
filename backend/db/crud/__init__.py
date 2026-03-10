"""Public re-export facade for all CRUD helpers."""

from backend.db.crud.citizen import (
    create_citizen,
    delete_citizen,
    get_citizen_by_email,
    get_citizen_by_id,
    list_citizens,
    update_citizen,
)
from backend.db.crud.admin import (
    create_admin,
    delete_admin,
    get_admin_by_email,
    get_admin_by_id,
    list_admins,
    update_admin,
)
from backend.db.crud.news import (
    bulk_upsert_articles,
    count_articles,
    create_comment,
    delete_comment,
    get_article_by_id,
    list_all_comments,
    list_articles,
    list_comments_by_article,
    upsert_article,
)
from backend.db.crud.jobs import (
    bulk_upsert_jobs,
    get_job_by_id,
    job_to_geojson_feature,
    list_jobs,
    upsert_job,
)
from backend.db.crud.housing import (
    bulk_upsert_housing,
    get_housing_by_id,
    housing_to_geojson_feature,
    list_housing,
    upsert_housing,
)
from backend.db.crud.benefits import (
    bulk_upsert_benefits,
    get_benefit_by_id,
    list_benefits,
    upsert_benefit,
)

__all__ = [
    "create_citizen",
    "get_citizen_by_id",
    "get_citizen_by_email",
    "list_citizens",
    "update_citizen",
    "delete_citizen",
    "create_admin",
    "get_admin_by_id",
    "get_admin_by_email",
    "list_admins",
    "update_admin",
    "delete_admin",
    "bulk_upsert_articles",
    "count_articles",
    "create_comment",
    "delete_comment",
    "get_article_by_id",
    "list_all_comments",
    "list_articles",
    "list_comments_by_article",
    "upsert_article",
    "bulk_upsert_jobs",
    "get_job_by_id",
    "job_to_geojson_feature",
    "list_jobs",
    "upsert_job",
    "bulk_upsert_housing",
    "get_housing_by_id",
    "housing_to_geojson_feature",
    "list_housing",
    "upsert_housing",
    "bulk_upsert_benefits",
    "get_benefit_by_id",
    "list_benefits",
    "upsert_benefit",
]
