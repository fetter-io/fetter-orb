use fetter::Package;
use fetter::PathShared;
use fetter::ScanFS;
use fetter::SystemTag;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use orb_model::db_context::DBContext;
use orb_model::db_context::Tenant;
use orb_model::db_via_container::get_db_pool;

#[tokio::test]
async fn test_tenant_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_tenant_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();
    let t = Tenant {
        key: "test".to_string(),
        name: "test".to_string(),
        ping_limit: 1,
    };
    let id = ctx.tenant_insert_or_get(&t).await.unwrap();
    assert_eq!(id, 1);

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_get_tenants_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_get_tenants_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();
    let t1 = Tenant {
        key: "aaa".to_string(),
        name: "AAA".to_string(),
        ping_limit: 1,
    };
    let _ = ctx.tenant_insert_or_get(&t1).await.unwrap();

    let t2 = Tenant {
        key: "bbb".to_string(),
        name: "BBB".to_string(),
        ping_limit: 1,
    };
    let _ = ctx.tenant_insert_or_get(&t2).await.unwrap();
    let tenants = ctx.get_tenants(None).await.unwrap();
    let json = serde_json::to_value(&tenants).unwrap();
    assert_eq!(
        serde_json::to_string(&json).unwrap(),
        r#"[[1,{"key":"aaa","name":"AAA","ping_limit":1}],[2,{"key":"bbb","name":"BBB","ping_limit":1}]]"#
    );

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_load_scan_fs_a() {
    let msg = "[[\"/usr/bin/python3\",\"/usr/lib/python3/site-packages\"],[[0,[1]]],[[{\"name\":\"flask\",\"key\":\"flask\",\"version\":\"1.1.3\",\"direct_url\":null},[1]],[{\"name\":\"numpy\",\"key\":\"numpy\",\"version\":\"1.19.3\",\"direct_url\":null},[1]],[{\"name\":\"static-frame\",\"key\":\"static_frame\",\"version\":\"2.13.0\",\"direct_url\":null},[1]]],[[1,0]],false,\"35cc8bbf5f965f99f2ed716a23e0cfbb70b8977ba65e837708e960fc13e51da2\"]";

    let sfs: ScanFS = serde_json::from_str(&msg).unwrap();
    assert_eq!(sfs.package_to_sites.len(), 3);
}

#[tokio::test]
async fn test_load_package_a() {
    let msg1 = r#"{
        "name":"dill",
        "key":"dill",
        "version":"0.3.8",
        "direct_url":{
            "url":"ssh://git@github.com/uqfoundation/dill.git",
            "vcs_info":{
                "commit_id":"a0a8e86976708d0436eec5c8f7d25329da727cb5",
                "vcs":"git",
                "revision":"0.3.8"
            }
        }
    }"#;
    let p1: Package = serde_json::from_str(&msg1).unwrap();
    assert_eq!(p1.key, "dill");

    let msg2 = r#"{
        "name":"numpy",
        "key":"numpy",
        "version":"2.1.2",
        "direct_url":null
    }"#;
    let p2: Package = serde_json::from_str(&msg2).unwrap();
    assert_eq!(p2.key, "numpy");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_load_package_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let p1_id = ctx.package_insert_or_get(&p1).await.unwrap();
    assert_eq!(p1_id, 1);

    let p2_id = ctx.package_insert_or_get(&p2).await.unwrap();
    assert_eq!(p2_id, 2);

    let p3_id = ctx.package_insert_or_get(&p1).await.unwrap();
    assert_eq!(p3_id, 1); // Should match p1_id

    let p1x = ctx.package_from_id(1).await.unwrap().unwrap();
    assert_eq!(p1x.name, "dill");

    let p2x = ctx.package_from_id(2).await.unwrap().unwrap();
    assert_eq!(p2x.name, "numpy");

    let p3x = ctx.package_from_id(3).await.unwrap();
    assert_eq!(p3x, None);

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_load_system_tag_a() {
    let msg = r#"{
        "username":"testuser",
        "hostname":"testhost",
        "os_name":"linux",
        "os_version":"5.10.0",
        "architecture":"x86_64",
        "logical_cores":8
    }"#;

    let st: SystemTag = serde_json::from_str(&msg).unwrap();
    assert_eq!(
        format!("{:?}", st),
        "SystemTag { username: \"testuser\", hostname: \"testhost\", os_name: \"linux\", os_version: \"5.10.0\", architecture: \"x86_64\", logical_cores: 8 }"
    );

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_load_system_tag_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let t = Tenant {
        key: "ffff".to_string(),
        name: "foo".to_string(),
        ping_limit: 1,
    };
    let t_id = ctx.tenant_insert_or_get(&t).await.unwrap();

    let st_id = ctx.system_tag_insert_or_get(t_id, &st).await.unwrap();
    assert_eq!(st_id, 1);

    // let st2 = ctx.system_tag_from_id(1).await.unwrap().unwrap();
    // assert_eq!(st2.os_name, "linux");
    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_system_tag_pings_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_system_tag_pings_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let post = ctx.system_tag_pings(1, None).await.unwrap().to_string();
    assert_eq!(
        post,
        "[{\"architecture\":\"aarch64\",\"hostname\":\"machine-x\",\"id\":1,\"logical_cores\":16,\"os_name\":\"macos\",\"os_version\":\"14.1.1\",\"pings\":[{\"scanned\":true,\"timestamp\":\"2025-07-18T23:23:45.131879Z\"}],\"site_packages\":[\"/Users/user1/.env311-fetter/lib/python3.11/site-packages\",\"/Users/user1/.env313-sf/lib/python3.13/site-packages\"],\"username\":\"user1\"}]"
    );

    ctx.tables_drop().await.unwrap();
}

//------------------------------------------------------------------------------
#[tokio::test]
async fn test_package_counts_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_package_counts_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let post1 = ctx
        .package_counts(None, None, None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(post1, r#"[["2025-07-18T23:23:45.131879Z",null,130]]"#);

    let post2 = ctx
        .package_counts(Some(1), Some(1), None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(post2, r#"[["2025-07-18T23:23:45.131879Z",null,130]]"#);

    let post3 = ctx
        .package_counts(Some(0), Some(0), None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(post3, r#"[]"#);
}

#[tokio::test]
async fn test_package_counts_b() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let mut path2 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path2.push("tests/fixtures/monitor-scan-02.json");
    let msg2 = fs::read_to_string(path2).expect("Failed to read JSON file");

    let mut path3 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path3.push("tests/fixtures/monitor-scan-03.json");
    let msg3 = fs::read_to_string(path3).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_package_counts_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg2).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg3).await.unwrap();

    let post1 = ctx
        .package_counts(None, None, None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(
        post1,
        r#"[["2025-07-18T23:23:45.131879Z","2025-07-19T01:47:43.072574Z",130],["2025-07-19T01:47:43.072574Z","2025-07-19T01:50:56.387136Z",27],["2025-07-19T01:50:56.387136Z",null,165]]"#
    );
}

//------------------------------------------------------------------------------
#[tokio::test]
async fn test_load_site_packages_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_load_site_packages_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let p1 = PathShared::from("/home/ariza/src/py_src/lib/python3.11/site-packages");
    let p2 = PathShared::from("/home/ariza/src/py_src/lib/python3.13/site-packages");
    let p3 = PathShared::from("/home/ariza/src/py_src/lib/python3.11/site-packages");

    let st_id1 = ctx.site_packages_insert_or_get(p1.clone()).await.unwrap();
    assert_eq!(st_id1, 1);

    let st_id2 = ctx.site_packages_insert_or_get(p2.clone()).await.unwrap();
    assert_eq!(st_id2, 2);

    let st_id3 = ctx.site_packages_insert_or_get(p3.clone()).await.unwrap();
    assert_eq!(st_id3, 1);

    ctx.tables_drop().await.unwrap();
}

//------------------------------------------------------------------------------

#[tokio::test]
async fn test_dep_manifest_load_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-02.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_dep_manifest_load_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();
    // do first to force tenant creation
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let msg = r#"[1, "numpy==2.0.0\nstatic-frame==2.0.0\n"]"#;
    ctx.dep_manifest_load_from_json(msg).await.unwrap();

    let dm = ctx.dep_manifest_from_tenant_id(1).await.unwrap().unwrap();
    assert_eq!(dm, "numpy==2.0.0\nstatic-frame==2.0.0\n");

    let json_obj = ctx.validate(Some(1), Some(1)).await.unwrap();
    let obj = json_obj.as_object().expect("Expected JSON object");
    let map: HashMap<String, String> = obj
        .iter()
        .map(|(k, v)| (k.clone(), v.to_string()))
        .collect();

    assert!(map.contains_key("dep_manifest"));
    assert!(map.contains_key("missing"));
    assert!(map.contains_key("unrequired"));
    assert!(map.contains_key("misdefined"));
    assert!(map.contains_key("undefined"));

    ctx.tables_drop().await.unwrap();
}

//------------------------------------------------------------------------------

#[tokio::test]
async fn test_latest_packages_to_sites_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_latest_packages_to_sites_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let (p_to_s, _p_to_id) = ctx
        .get_latest_packages_to_sites(None, Some(1))
        .await
        .unwrap();
    assert_eq!(p_to_s.len(), 130);

    ctx.tables_drop().await.unwrap();
}

//------------------------------------------------------------------------------

#[tokio::test]
async fn test_tables_create_and_index_check() -> Result<(), sqlx::Error> {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_tables_create_and_index_check".into()), 1);

    // Drop and create tables
    ctx.tables_drop().await.ok();
    ctx.tables_create(true).await?;

    // Check that expected indexes exist
    let expected_indexes = [
        "monitor_scan_package_id_idx",
        "monitor_scan_ping_id_idx",
        "ping_system_tag_id_idx",
        "system_tag_tenant_id_idx",
        "package_key_idx",
    ];

    for index_name in expected_indexes {
        let exists: (bool,) = sqlx::query_as(
            r#"
            SELECT EXISTS (
                SELECT 1 FROM pg_indexes WHERE indexname = $1
            )
            "#,
        )
        .bind(index_name)
        .fetch_one(&ctx.pool)
        .await?;

        if exists.0 {
            println!("`{}` exists", index_name);
        } else {
            println!("`{}` is missing", index_name);
        }

        assert!(exists.0, "Index `{}` was not created", index_name);
    }

    Ok(())
}

#[tokio::test]
async fn test_user_tenant_init_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_user_tenant_init_a".into()), 1);
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let uid = ctx
        .user_tenant_init("foo", "foo@foo.com", "Foo", "42")
        .await
        .unwrap();

    assert!(uid == 1);

    let uid_post = ctx.user_id_from_login("foo").await.unwrap();
    assert!(uid_post == Some(1));
    ctx.tables_drop().await.unwrap();
}
