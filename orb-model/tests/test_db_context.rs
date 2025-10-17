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
    let ctx = DBContext::new(pool, Some("test_tenant_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant {
        key: "test".to_string(),
        name: "test".to_string(),
        ping_limit: 1,
        created_by: user_id,
    };
    let tenant_id = ctx.tenant_insert_or_get(&t).await.unwrap();
    assert_eq!(tenant_id, 2);
    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_get_tenants_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_get_tenants_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();

    let t1 = Tenant {
        key: "aaa".to_string(),
        name: "AAA".to_string(),
        ping_limit: 1,
        created_by: user_id,
    };
    let _ = ctx.tenant_insert_or_get(&t1).await.unwrap();

    let t2 = Tenant {
        key: "bbb".to_string(),
        name: "BBB".to_string(),
        ping_limit: 1,
        created_by: user_id,
    };
    let _ = ctx.tenant_insert_or_get(&t2).await.unwrap();

    let mut tenants: Vec<(i32, Tenant)> = ctx
        .get_tenants(None)
        .await
        .unwrap()
        .into_iter()
        .filter(|(_, t)| t.name != "Self")
        .collect();

    tenants.sort_by_key(|(_, t)| t.key.clone());

    assert_eq!(tenants.len(), 2);

    // Entry 0
    let (id0, t0) = &tenants[0];
    assert!(*id0 > 0);
    assert_eq!(t0.key, "aaa");
    assert_eq!(t0.name, "AAA");
    assert_eq!(t0.ping_limit, 1);
    assert_eq!(t0.created_by, user_id);

    // Entry 1
    let (id1, t1) = &tenants[1];
    assert!(*id1 > 0);
    assert_eq!(t1.key, "bbb");
    assert_eq!(t1.name, "BBB");
    assert_eq!(t1.ping_limit, 1);
    assert_eq!(t1.created_by, user_id);

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_load_scan_fs_a() {
    let msg = "[[\"/usr/bin/python3\",\"/usr/lib/python3/site-packages\"],[[0,[1]]],[[{\"name\":\"flask\",\"key\":\"flask\",\"version\":\"1.1.3\",\"direct_url\":null},[1]],[{\"name\":\"numpy\",\"key\":\"numpy\",\"version\":\"1.19.3\",\"direct_url\":null},[1]],[{\"name\":\"static-frame\",\"key\":\"static_frame\",\"version\":\"2.13.0\",\"direct_url\":null},[1]]],[[1,[0]]],false,false,\"35cc8bbf5f965f99f2ed716a23e0cfbb70b8977ba65e837708e960fc13e51da2\"]";

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
    let ctx = DBContext::new(pool, Some("test_load_package_a".into()));
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
    let ctx = DBContext::new(pool, Some("test_load_system_tag_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();

    let t = Tenant {
        key: "ffff".to_string(),
        name: "foo".to_string(),
        ping_limit: 1,
        created_by: user_id,
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
    let ctx = DBContext::new(pool, Some("test_system_tag_pings_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let post = ctx.system_tag_pings(2, None).await.unwrap().to_string();
    assert_eq!(
        post,
        "[{\"architecture\":\"aarch64\",\"hostname\":\"machine-x\",\"id\":1,\"logical_cores\":16,\"os_name\":\"macos\",\"os_version\":\"14.1.1\",\"pings\":[{\"scanned\":true,\"timestamp\":\"2025-07-18T23:23:45.131879Z\"}],\"site_packages\":[\"/Users/user1/.env311-fetter/lib/python3.11/site-packages\",\"/Users/user1/.env313-sf/lib/python3.13/site-packages\"],\"username\":\"user1\"}]"
    );

    ctx.tables_drop().await.unwrap();
}

//------------------------------------------------------------------------------
#[tokio::test]
async fn test_user_delete_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_user_delete_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let post1 = ctx
        .package_counts(Some(1), Some(1), None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(post1, r#"[["2025-07-18T23:23:45.131879Z",null,130]]"#);

    let _ = ctx.user_delete(user_id).await.unwrap();

    let post2 = ctx
        .package_counts(Some(1), Some(1), None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(post2, r#"[]"#);

    ctx.tables_drop().await.unwrap();
}

// //------------------------------------------------------------------------------
#[tokio::test]
async fn test_package_counts_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_package_counts_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let post1 = ctx
        .package_counts(None, None, None)
        .await
        .unwrap()
        .to_string();
    assert_eq!(post1, r#"[["2025-07-18T23:23:45.131879Z",null,130]]"#);

    let post2 = ctx
        .package_counts(Some(1), Some(2), None)
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
    let ctx = DBContext::new(pool, Some("test_package_counts_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();

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

// //------------------------------------------------------------------------------
#[tokio::test]
async fn test_load_site_packages_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_load_site_packages_a".into()));
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

// //------------------------------------------------------------------------------

#[tokio::test]
async fn test_dep_manifest_load_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-02.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_dep_manifest_load_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();

    // do first to force tenant creation
    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let msg = format!(
        r#"{{"user_id": "{}", "tenant_id": 2, "content": "numpy==2.0.0\nstatic-frame==2.0.0\n", "superset": true, "subset": false}}"#,
        user_id
    );
    let result = ctx.dep_manifest_load_from_json(&msg).await.unwrap();
    assert!(
        result,
        "dep_manifest_load should succeed for authorized user"
    );

    let dm = ctx.dep_manifest_from_tenant_id(2).await.unwrap().unwrap();
    assert_eq!(dm.content, "numpy==2.0.0\nstatic-frame==2.0.0\n");
    assert_eq!(dm.superset, true);
    assert_eq!(dm.subset, false);

    let json_obj = ctx.validate(Some(1), Some(2)).await.unwrap();
    let obj = json_obj.as_object().expect("Expected JSON object");
    let map: HashMap<String, String> = obj
        .iter()
        .map(|(k, v)| (k.clone(), v.to_string()))
        .collect();

    assert!(map.contains_key("dep_manifest"));
    assert!(map.contains_key("missing"));
    assert!(map.contains_key("unrequired"));
    assert!(map.contains_key("misdefined"));

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_validate_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-02.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_validate_missing_package_depspec".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    // Create a dep_manifest with packages that don't exist in the system
    let msg = format!(
        r#"{{"user_id": "{}", "tenant_id": 2, "content": "numpy==2.0.0\nmissing-package==1.0.0\nanother-missing>=2.5.0\n", "superset": false, "subset": false}}"#,
        user_id
    );
    let result = ctx.dep_manifest_load_from_json(&msg).await.unwrap();
    assert!(
        result,
        "dep_manifest_load should succeed for authorized user"
    );

    // Run validation
    let json_obj = ctx.validate(Some(1), Some(2)).await.unwrap();
    let obj = json_obj.as_object().expect("Expected JSON object");

    // Check that missing array exists and contains the expected structure
    let missing = obj.get("missing").expect("missing key should exist");
    let missing_array = missing.as_array().expect("missing should be an array");
    assert!(!missing_array.is_empty(), "Should have missing packages");

    // Check the structure of missing entries
    let mut found_missing_package = false;
    let mut found_another_missing = false;

    for entry in missing_array {
        let entry_array = entry.as_array().expect("Each entry should be an array");
        assert_eq!(
            entry_array.len(),
            3,
            "Each entry should have 3 elements: [id, dep_spec, site]"
        );

        let id = entry_array[0]
            .as_i64()
            .expect("First element should be package id");
        let dep_spec = &entry_array[1];
        let site = &entry_array[2];

        // Missing packages should have id = -1
        if id == -1 {
            if let Some(dep_spec_obj) = dep_spec.as_array() {
                assert_eq!(dep_spec_obj.len(), 2, "DepSpec should have [name, spec]");
                let name = dep_spec_obj[0].as_str().expect("Name should be string");
                let spec = dep_spec_obj[1].as_str().expect("Spec should be string");

                if name == "missing-package" {
                    assert_eq!(spec, "==1.0.0");
                    found_missing_package = true;
                }
                if name == "another-missing" {
                    assert_eq!(spec, ">=2.5.0");
                    found_another_missing = true;
                }
            }
            assert!(site.is_null(), "Site should be null for missing packages");
        }
    }

    assert!(
        found_missing_package,
        "Should find missing-package==1.0.0 in missing entries"
    );
    assert!(
        found_another_missing,
        "Should find another-missing>=2.5.0 in missing entries"
    );

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_validate_b() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-02.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");
    let pool = get_db_pool().await;
    let ctx = DBContext::new(
        pool,
        Some("test_validate_existing_packages_no_depspec".into()),
    );
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    // Create a dep_manifest with packages that exist but are unrequired
    let msg = format!(
        r#"{{"user_id": "{}", "tenant_id": 2, "content": "", "superset": false, "subset": false}}"#,
        user_id
    );
    let result = ctx.dep_manifest_load_from_json(&msg).await.unwrap();
    assert!(
        result,
        "dep_manifest_load should succeed for authorized user"
    );

    // Run validation
    let json_obj = ctx.validate(Some(1), Some(2)).await.unwrap();
    let obj = json_obj.as_object().expect("Expected JSON object");

    // Check unrequired packages - these should have real package IDs, not DepSpec
    let unrequired = obj.get("unrequired").expect("unrequired key should exist");
    let unrequired_array = unrequired
        .as_array()
        .expect("unrequired should be an array");
    assert!(
        !unrequired_array.is_empty(),
        "Should have unrequired packages"
    );

    for entry in unrequired_array {
        let entry_array = entry.as_array().expect("Each entry should be an array");
        assert_eq!(
            entry_array.len(),
            3,
            "Each entry should have 3 elements: [id, dep_spec, site]"
        );

        let id = entry_array[0]
            .as_i64()
            .expect("First element should be package id");
        let dep_spec = &entry_array[1];
        // let _site = &entry_array[2];

        // Existing packages should have real package IDs (not -1) and null dep_spec
        assert_ne!(id, -1, "Existing packages should have real package IDs");
        assert!(
            dep_spec.is_null(),
            "Existing packages should have null dep_spec"
        );
    }

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_derive_dep_manifest_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-02.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_derive_dep_manifest".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();
    let json_obj = ctx.dep_manifest_derive(Some(1), Some(2)).await.unwrap();
    let dep_specs = json_obj.as_array().expect("Expected JSON array");

    assert!(
        !dep_specs.is_empty(),
        "Should have derived dependency specifications"
    );
    let spec_strings: Vec<String> = dep_specs
        .iter()
        .map(|spec| {
            spec.as_str()
                .expect("Each entry should be a string")
                .to_string()
        })
        .collect();

    let expected_packages = vec![
        "asttokens>=2.4.1",
        "decorator>=5.1.1",
        "dill>=0.3.8",
        "executing>=2.1.0",
        "fetter>=1.0.0",
    ];

    for expected in &expected_packages {
        assert!(
            spec_strings.contains(&expected.to_string()),
            "Expected to find '{}' in derived specifications",
            expected
        );
    }

    let json_obj_all = ctx.dep_manifest_derive(None, None).await.unwrap();
    let dep_specs_all = json_obj_all.as_array().expect("Expected JSON array");
    assert!(
        dep_specs_all.len() >= dep_specs.len(),
        "All packages should include at least the filtered packages"
    );

    ctx.tables_drop().await.unwrap();
}

// //------------------------------------------------------------------------------

#[tokio::test]
async fn test_latest_packages_to_sites_a() {
    let mut path1 = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    path1.push("tests/fixtures/monitor-scan-01.json");
    let msg1 = fs::read_to_string(path1).expect("Failed to read JSON file");

    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_latest_packages_to_sites_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();
    let t = Tenant::from_key("team-a", user_id);
    let _ = ctx.tenant_insert_or_get(&t).await.unwrap();

    ctx.monitor_scan_load_from_json(&msg1).await.unwrap();

    let (p_to_s, _p_to_id) = ctx
        .get_latest_packages_to_sites(None, Some(2))
        .await
        .unwrap();
    assert_eq!(p_to_s.len(), 130);

    ctx.tables_drop().await.unwrap();
}

// //------------------------------------------------------------------------------

#[tokio::test]
async fn test_tables_create_and_index_check() -> Result<(), sqlx::Error> {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_tables_create_and_index_check".into()));

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
        assert!(exists.0, "Index `{}` was not created", index_name);
    }

    Ok(())
}

#[tokio::test]
async fn test_user_tenant_init_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_user_tenant_init_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let uid = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();

    assert!(uid.to_string().len() == 36);

    // let uid_post = ctx.user_id_from_login("foo").await.unwrap();
    // assert!(uid_post == Some(uid));

    let u = ctx.user_from_user_id(uid).await.unwrap();
    // assert_eq!(u.id, 1);
    assert_eq!(u.github_login, "foo");
    assert_eq!(u.email, Some("foo@foo.com".to_string()));
    assert_eq!(u.term_accepted, false);

    ctx.tables_drop().await.unwrap();
}

// //------------------------------------------------------------------------------

#[tokio::test]
async fn test_user_tenant_last_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_user_tenant_last_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    let user_id = ctx
        .user_tenant_init("foo", 0, "foo@foo.com", "Foo")
        .await
        .unwrap();

    let post1 = ctx.user_tenant_last(user_id).await.unwrap();
    assert_eq!(post1, Some(1));

    let _ = ctx.user_set_tenant_last(user_id, 1).await.unwrap();

    let post2 = ctx.user_tenant_last(user_id).await.unwrap();
    assert_eq!(post2, Some(1));

    assert!(ctx.user_set_tenant_last(user_id, 2).await.is_err());

    let t = Tenant {
        key: "test".to_string(),
        name: "test".to_string(),
        ping_limit: 1,
        created_by: user_id,
    };
    let id = ctx.tenant_insert_or_get(&t).await.unwrap();
    assert_eq!(id, 2);

    let _ = ctx.user_set_tenant_last(user_id, 2).await.unwrap();

    let post3 = ctx.user_tenant_last(user_id).await.unwrap();
    assert_eq!(post3, Some(2));
}

#[tokio::test]
async fn test_tenant_rename() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_tenant_rename".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    // Create two users with different github_ids
    let user1_id = ctx
        .user_tenant_init("user1", 1, "user1@example.com", "User One")
        .await
        .unwrap();
    let user2_id = ctx
        .user_tenant_init("user2", 2, "user2@example.com", "User Two")
        .await
        .unwrap();

    // Create a tenant owned by user1
    let tenant = Tenant {
        key: "test-tenant".to_string(),
        name: "Original Name".to_string(),
        ping_limit: 10,
        created_by: user1_id,
    };
    let tenant_id = ctx.tenant_insert_or_get(&tenant).await.unwrap();

    // Assign the owner to the tenant so they can access it via get_tenants
    ctx.tenant_assign_user(tenant_id, user1_id).await.unwrap();

    // Test 1: Owner can rename the tenant
    let result = ctx
        .tenant_rename(tenant_id, Some(user1_id), "New Name")
        .await
        .unwrap();
    assert!(result, "Owner should be able to rename the tenant");

    // Verify the name was changed
    let tenants = ctx.get_tenants(Some(user1_id)).await.unwrap();
    let renamed_tenant = tenants
        .iter()
        .find(|(id, _)| *id == tenant_id)
        .map(|(_, t)| t)
        .expect("Tenant should exist");
    assert_eq!(renamed_tenant.name, "New Name");

    // Test 2: Non-owner cannot rename the tenant
    let result = ctx
        .tenant_rename(tenant_id, Some(user2_id), "Unauthorized Name")
        .await
        .unwrap();
    assert!(!result, "Non-owner should not be able to rename the tenant");

    // Verify the name was not changed
    let tenants = ctx.get_tenants(Some(user1_id)).await.unwrap();
    let unchanged_tenant = tenants
        .iter()
        .find(|(id, _)| *id == tenant_id)
        .map(|(_, t)| t)
        .expect("Tenant should exist");
    assert_eq!(unchanged_tenant.name, "New Name"); // Should still be "New Name"

    // Test 3: Rename without user_id (no authorization check)
    let result = ctx
        .tenant_rename(tenant_id, None, "Admin Renamed")
        .await
        .unwrap();
    assert!(result, "Rename should succeed when no user_id is provided");

    // Verify the name was changed
    let tenants = ctx.get_tenants(Some(user1_id)).await.unwrap();
    let admin_renamed_tenant = tenants
        .iter()
        .find(|(id, _)| *id == tenant_id)
        .map(|(_, t)| t)
        .expect("Tenant should exist");
    assert_eq!(admin_renamed_tenant.name, "Admin Renamed");

    // Test 4: Rename non-existent tenant
    let result = ctx
        .tenant_rename(99999, Some(user1_id), "Non-existent")
        .await
        .unwrap();
    assert!(!result, "Renaming non-existent tenant should return false");

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_tenant_set_ping_limit() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_tenant_set_ping_limit".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    // Create two users with different github_ids
    let user1_id = ctx
        .user_tenant_init("user1", 1, "user1@example.com", "User One")
        .await
        .unwrap();
    let user2_id = ctx
        .user_tenant_init("user2", 2, "user2@example.com", "User Two")
        .await
        .unwrap();

    // Create a tenant owned by user1
    let tenant = Tenant {
        key: "test-tenant".to_string(),
        name: "Test Tenant".to_string(),
        ping_limit: 10,
        created_by: user1_id,
    };
    let tenant_id = ctx.tenant_insert_or_get(&tenant).await.unwrap();

    // Assign the owner to the tenant so they can access it via get_tenants
    ctx.tenant_assign_user(tenant_id, user1_id).await.unwrap();

    // Test 1: Owner can set the ping limit
    let result = ctx
        .tenant_set_ping_limit(tenant_id, Some(user1_id), 50)
        .await
        .unwrap();
    assert!(result, "Owner should be able to set the ping limit");

    // Verify the ping limit was changed
    let tenants = ctx.get_tenants(Some(user1_id)).await.unwrap();
    let updated_tenant = tenants
        .iter()
        .find(|(id, _)| *id == tenant_id)
        .map(|(_, t)| t)
        .expect("Tenant should exist");
    assert_eq!(updated_tenant.ping_limit, 50);

    // Test 2: Non-owner cannot set the ping limit
    let result = ctx
        .tenant_set_ping_limit(tenant_id, Some(user2_id), 100)
        .await
        .unwrap();
    assert!(
        !result,
        "Non-owner should not be able to set the ping limit"
    );

    // Verify the ping limit was not changed
    let tenants = ctx.get_tenants(Some(user1_id)).await.unwrap();
    let unchanged_tenant = tenants
        .iter()
        .find(|(id, _)| *id == tenant_id)
        .map(|(_, t)| t)
        .expect("Tenant should exist");
    assert_eq!(unchanged_tenant.ping_limit, 50); // Should still be 50

    // Test 3: Set ping limit without user_id (no authorization check)
    let result = ctx
        .tenant_set_ping_limit(tenant_id, None, 200)
        .await
        .unwrap();
    assert!(
        result,
        "Setting ping limit should succeed when no user_id is provided"
    );

    // Verify the ping limit was changed
    let tenants = ctx.get_tenants(Some(user1_id)).await.unwrap();
    let admin_updated_tenant = tenants
        .iter()
        .find(|(id, _)| *id == tenant_id)
        .map(|(_, t)| t)
        .expect("Tenant should exist");
    assert_eq!(admin_updated_tenant.ping_limit, 200);

    // Test 4: Set ping limit for non-existent tenant
    let result = ctx
        .tenant_set_ping_limit(99999, Some(user1_id), 500)
        .await
        .unwrap();
    assert!(
        !result,
        "Setting ping limit for non-existent tenant should return false"
    );

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_get_users_a() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_get_users_a".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    // Create multiple users
    let user1_id = ctx
        .user_tenant_init("alice", 100, "alice@example.com", "Alice Smith")
        .await
        .unwrap();
    let user2_id = ctx
        .user_tenant_init("bob", 200, "bob@example.com", "Bob Jones")
        .await
        .unwrap();
    let user3_id = ctx
        .user_tenant_init("charlie", 300, "charlie@example.com", "Charlie Brown")
        .await
        .unwrap();

    // Get all users
    let users = ctx.get_users().await.unwrap();

    // Should have 3 users
    assert_eq!(users.len(), 3);

    // Verify user data - find each user by github_login
    let alice = users
        .iter()
        .find(|u| u.github_login == "alice")
        .expect("Alice should exist");
    assert_eq!(alice.id, user1_id);
    assert_eq!(alice.github_id, 100);
    assert_eq!(alice.email, Some("alice@example.com".to_string()));
    assert_eq!(alice.name, Some("Alice Smith".to_string()));
    assert_eq!(alice.term_accepted, false);

    let bob = users
        .iter()
        .find(|u| u.github_login == "bob")
        .expect("Bob should exist");
    assert_eq!(bob.id, user2_id);
    assert_eq!(bob.github_id, 200);
    assert_eq!(bob.email, Some("bob@example.com".to_string()));
    assert_eq!(bob.name, Some("Bob Jones".to_string()));

    let charlie = users
        .iter()
        .find(|u| u.github_login == "charlie")
        .expect("Charlie should exist");
    assert_eq!(charlie.id, user3_id);
    assert_eq!(charlie.github_id, 300);
    assert_eq!(charlie.email, Some("charlie@example.com".to_string()));
    assert_eq!(charlie.name, Some("Charlie Brown".to_string()));

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_get_users_b() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_get_users_empty".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    // Get users when table is empty
    let users = ctx.get_users().await.unwrap();
    assert_eq!(users.len(), 0);

    ctx.tables_drop().await.unwrap();
}

#[tokio::test]
async fn test_get_users_c() {
    let pool = get_db_pool().await;
    let ctx = DBContext::new(pool, Some("test_get_users_after_term_accepted".into()));
    ctx.tables_drop().await.unwrap();
    ctx.tables_create(false).await.unwrap();

    // Create a user
    let user_id = ctx
        .user_tenant_init("test_user", 999, "test@example.com", "Test User")
        .await
        .unwrap();

    // Initially, term_accepted should be false
    let users_before = ctx.get_users().await.unwrap();
    assert_eq!(users_before.len(), 1);
    assert_eq!(users_before[0].term_accepted, false);

    // Accept terms
    ctx.user_set_term_accepted(user_id).await.unwrap();

    // Now term_accepted should be true
    let users_after = ctx.get_users().await.unwrap();
    assert_eq!(users_after.len(), 1);
    assert_eq!(users_after[0].term_accepted, true);
    assert_eq!(users_after[0].github_login, "test_user");

    ctx.tables_drop().await.unwrap();
}
