// use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use fetter::Package;
use fetter::PathShared;
use fetter::ScanFS;
use fetter::SystemTag;

use orb_model::db_context::DBContext;
use orb_model::db_context::Tenant;
use orb_model::db_via_container::get_db_pool;

#[tokio::test]
async fn test_tenant_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("ta".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();
    let t = Tenant {
        key: "test".to_string(),
        name: "test".to_string(),
    };
    let id = ctx.tenant_insert_or_get(&t).await.unwrap();
    assert_eq!(id, 1);
}

#[tokio::test]
async fn test_tenant_all_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("taa".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();
    let t1 = Tenant {
        key: "aaa".to_string(),
        name: "AAA".to_string(),
    };
    let _ = ctx.tenant_insert_or_get(&t1).await.unwrap();

    let t2 = Tenant {
        key: "bbb".to_string(),
        name: "BBB".to_string(),
    };
    let _ = ctx.tenant_insert_or_get(&t2).await.unwrap();
    let tenants = ctx.tenant_all().await.unwrap();
    let json = serde_json::to_value(&tenants).unwrap();
    assert_eq!(
        serde_json::to_string(&json).unwrap(),
        r#"[[1,{"key":"aaa","name":"AAA"}],[2,{"key":"bbb","name":"BBB"}]]"#
    );
}

#[tokio::test]
async fn test_load_scan_fs_a() {
    let msg = "[[[\"/usr/bin/python3\",[\"/usr/lib/python3/site-packages\"]]],[[{\"name\":\"flask\",\"key\":\"flask\",\"version\":\"1.1.3\",\"direct_url\":null},[\"/usr/lib/python3/site-packages\"]],[{\"name\":\"numpy\",\"key\":\"numpy\",\"version\":\"1.19.3\",\"direct_url\":null},[\"/usr/lib/python3/site-packages\"]],[{\"name\":\"static-frame\",\"key\":\"static_frame\",\"version\":\"2.13.0\",\"direct_url\":null},[\"/usr/lib/python3/site-packages\"]]],[[\"/usr/lib/python3/site-packages\",\"/usr/bin/python3\"]],false,\"35cc8bbf5f965f99f2ed716a23e0cfbb70b8977ba65e837708e960fc13e51da2\"]";

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
    let ctx = DBContext::new(pool, Some("lpa".into()));

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

// #[tokio::test]
// async fn test_package_all_a() {
//     let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
//     path1.push("tests/fixtures/monitor-scan-04.json");
//     let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

//     let pool = get_db_pool().await;
//     let ctx = DBContext::new(pool, Some("paa".into()));
//     ctx.tables_drop().await.unwrap();
//     ctx.tables_create(false).await.unwrap();

//     ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

//     let post = ctx.package_all(1).await.unwrap();
//     assert_eq!(post.len(), 19);
//     ctx.tables_drop().await.unwrap();
// }

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
    let ctx = DBContext::new(pool, Some("lsta".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let t = Tenant {
        key: "ffff".to_string(),
        name: "foo".to_string(),
    };
    let t_id = ctx.tenant_insert_or_get(&t).await.unwrap();

    let st_id = ctx.system_tag_insert_or_get(t_id, &st).await.unwrap();
    assert_eq!(st_id, 1);

    // let st2 = ctx.system_tag_from_id(1).await.unwrap().unwrap();
    // assert_eq!(st2.os_name, "linux");
    // ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_system_tag_pings_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("stpa".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-04.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    // this may have already been inserted
    let t = Tenant {
        key: "test".to_string(),
        name: "test".to_string(),
    };
    let t_id = ctx.tenant_insert_or_get(&t).await.unwrap();

    let post = ctx.system_tag_pings(t_id, None).await.unwrap().to_string();
    println!("{}", post);
    assert_eq!(
        post,
        r#"[{"architecture":"x86_64","hostname":"is-ariza-p1g7","id":1,"logical_cores":22,"os_name":"linux","os_version":"24.04","pings":[{"scanned":true,"timestamp":"2025-04-02T21:58:08.072262Z"}],"site_packages":["~/.env312-bs/lib/python3.12/site-packages"],"username":"ariza"}]"#
    );

    ctx.tables_drop().await.unwrap();
}

//------------------------------------------------------------------------------
#[tokio::test]
async fn test_package_counts_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-03.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let mut path2 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path2.push("tests/fixtures/monitor-scan-04.json");
    let msg2 = fs::read_to_string(path2).expect("Failed to read JSON file");

    let mut path3 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path3.push("tests/fixtures/monitor-scan-05.json");
    let msg3 = fs::read_to_string(path3).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("pca".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg2).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg3).await.unwrap();

    let post1 = ctx
        .package_counts(None, Some(1), None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(
        post1,
        r#"[["2025-04-02T21:53:09.367412Z","2025-04-02T21:58:08.072262Z",166],["2025-04-02T21:58:08.072262Z","2025-04-02T22:14:48.072262Z",185],["2025-04-02T22:14:48.072262Z",null,168]]"#
    );

    let post2 = ctx
        .package_counts(Some(1), Some(1), None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(post2, r#"[["2025-04-02T21:53:09.367412Z",null,166]]"#);

    let post3 = ctx
        .package_counts(Some(2), Some(1), None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(
        post3,
        r#"[["2025-04-02T21:58:08.072262Z","2025-04-02T22:14:48.072262Z",19],["2025-04-02T22:14:48.072262Z",null,2]]"#
    );
}

//------------------------------------------------------------------------------
#[tokio::test]
async fn test_load_site_packages_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("lspa1".into()));
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

    // let p4 = ctx.site_packages_from_id(2).await.unwrap().unwrap();
    // assert!(p4
    //     .to_string()
    //     .ends_with("src/py_src/lib/python3.13/site-packages"));

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_monitor_scan_load_a() {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("tests/fixtures/monitor-scan-03.json");
    let msg = fs::read_to_string(path).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("msla".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg).await.unwrap();

    let post = ctx.package_versions(Some(1), None).await.unwrap();
    // variability due to home path substitution
    assert!(post.to_string().len() >= 37949);
    ctx.tables_drop().await.unwrap();

    // let post = ctx.monitor_scan_site_to_packages(None).await.unwrap();
    // assert_eq!(post.get(&1).unwrap().len(), 11);
}

#[tokio::test]
async fn test_monitor_scan_load_b() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let mut path2 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path2.push("tests/fixtures/monitor-scan-02.json");
    let msg2 = fs::read_to_string(path2).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("mslb".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg2).await.unwrap();

    // let post1 = ctx
    //     .monitor_scan_get_packages(&HashSet::from([1]), None)
    //     .await
    //     .unwrap();
    // assert_eq!(post1.len(), 536);

    // let post2 = ctx
    //     .monitor_scan_get_packages(&HashSet::from([2]), None)
    //     .await
    //     .unwrap();
    // assert_eq!(post2.len(), 375);

    // let post3 = ctx
    //     .monitor_scan_get_packages(&HashSet::from([1, 2]), None)
    //     .await
    //     .unwrap();
    // assert_eq!(post3.len(), 779);
}

//------------------------------------------------------------------------------

#[tokio::test]
async fn test_dep_manifest_load_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-04.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("dmla".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();
    // do first to force tenant creation
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let msg = r#"[1, "numpy==2.0.0\nstatic-frame==2.0.0\n"]"#;
    ctx.dep_manifest_load_from_json(msg).await.unwrap();

    let dm = ctx.dep_manifest_from_tenant_id(1).await.unwrap().unwrap();
    assert_eq!(dm, "numpy==2.0.0\nstatic-frame==2.0.0\n");

    ctx.tables_drop().await.unwrap();
}

//------------------------------------------------------------------------------

#[tokio::test]
async fn test_latest_packages_to_sites_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-04.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("lptsa".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let (p_to_s, _p_to_id) = ctx
        .get_latest_packages_to_sites(None, Some(1))
        .await
        .unwrap();
    assert_eq!(p_to_s.len(), 19);

    ctx.tables_drop().await.unwrap();
}

//------------------------------------------------------------------------------

#[tokio::test]
async fn test_tables_create_and_index_check() -> Result<(), sqlx::Error> {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("tci".into()));

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
