use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

mod db_fixture;

use fetter::Package;
use fetter::PathShared;
use fetter::ScanFS;
use fetter::SystemTag;

use orb_model::db_context::DBContext;
use orb_model::db_via_container::get_db_pool;

#[tokio::test]
async fn load_scan_fs_a() {
    let msg = "[[[\"/usr/bin/python3\",[\"/usr/lib/python3/site-packages\"]]],[[{\"name\":\"flask\",\"key\":\"flask\",\"version\":\"1.1.3\",\"direct_url\":null},[\"/usr/lib/python3/site-packages\"]],[{\"name\":\"numpy\",\"key\":\"numpy\",\"version\":\"1.19.3\",\"direct_url\":null},[\"/usr/lib/python3/site-packages\"]],[{\"name\":\"static-frame\",\"key\":\"static_frame\",\"version\":\"2.13.0\",\"direct_url\":null},[\"/usr/lib/python3/site-packages\"]]],[[\"/usr/lib/python3/site-packages\",\"/usr/bin/python3\"]],false,\"35cc8bbf5f965f99f2ed716a23e0cfbb70b8977ba65e837708e960fc13e51da2\"]";

    let sfs: ScanFS = serde_json::from_str(&msg).unwrap();
    assert_eq!(sfs.package_to_sites.len(), 3);
}

#[tokio::test]
async fn load_package_a() {
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
    let ctx = DBContext::new(pool, Some("lpa"));

    ctx.tables_create().await.unwrap();

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
}

#[tokio::test]
async fn load_system_tag_a() {
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
    let ctx = DBContext::new(pool, Some("lsta"));

    ctx.tables_create().await.unwrap();

    let st_id = ctx.system_tag_insert_or_get(&st).await.unwrap();
    assert_eq!(st_id, 1);

    let st2 = ctx.system_tag_from_id(1).await.unwrap().unwrap();
    assert_eq!(st2.os_name, "linux");
}

#[tokio::test]
async fn system_tag_all_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("staa"));
    ctx.tables_create().await.unwrap();

    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let post = ctx.system_tag_all().await.unwrap();
    assert_eq!(post.len(), 1);
    assert_eq!(post[0].1.architecture, "x86_64");
}

#[tokio::test]
async fn load_site_packages_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("lspa1"));

    ctx.tables_create().await.unwrap();

    let p1 = PathShared::from("/home/ariza/src/py_src/lib/python3.11/site-packages");
    let p2 = PathShared::from("/home/ariza/src/py_src/lib/python3.13/site-packages");
    let p3 = PathShared::from("/home/ariza/src/py_src/lib/python3.11/site-packages");

    let st_id1 = ctx.site_packages_insert_or_get(p1.clone()).await.unwrap();
    assert_eq!(st_id1, 1);

    let st_id2 = ctx.site_packages_insert_or_get(p2.clone()).await.unwrap();
    assert_eq!(st_id2, 2);

    let st_id3 = ctx.site_packages_insert_or_get(p3.clone()).await.unwrap();
    assert_eq!(st_id3, 1);

    let p4 = ctx.site_packages_from_id(2).await.unwrap().unwrap();
    assert!(p4
        .to_string()
        .ends_with("src/py_src/lib/python3.13/site-packages"));

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn monitor_scan_load_a() {
    let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path.push("tests/fixtures/monitor-scan-01.json");
    let msg = fs::read_to_string(path).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("msla"));

    ctx.tables_create().await.unwrap();
    ctx.monitor_scan_load_from_json(&msg).await.unwrap();

    let post = ctx.monitor_scan_site_to_packages(None).await.unwrap();
    assert_eq!(post.get(&1).unwrap().len(), 11);
}

#[tokio::test]
async fn monitor_scan_load_b() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let mut path2 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path2.push("tests/fixtures/monitor-scan-02.json");
    let msg2 = fs::read_to_string(path2).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("mslb"));

    ctx.tables_create().await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg2).await.unwrap();

    let post1 = ctx
        .monitor_scan_get_packages(&HashSet::from([1]), None)
        .await
        .unwrap();
    assert_eq!(post1.len(), 536);

    let post2 = ctx
        .monitor_scan_get_packages(&HashSet::from([2]), None)
        .await
        .unwrap();
    assert_eq!(post2.len(), 375);

    let post3 = ctx
        .monitor_scan_get_packages(&HashSet::from([1, 2]), None)
        .await
        .unwrap();
    assert_eq!(post3.len(), 779);
}
