// Temporary file for testing the Herdr review mod. Safe to delete.
use std::collections::HashMap;

pub struct Cache {
    items: HashMap<String, String>,
    limit: usize,
}

impl Cache {
    pub fn new(limit: usize) -> Self {
        Self { items: HashMap::new(), limit }
    }

    pub fn get(&self, key: &str) -> Option<&String> {
        self.items.get(key)
    }

    pub fn put(&mut self, key: String, value: String) {
        if self.items.len() >= self.limit {
            return;
        }
        self.items.insert(key, value);
    }

    pub fn len(&self) -> usize {
        self.items.len()
    }
}

fn main() {
    let mut cache = Cache::new(2);
    cache.put("a".into(), "1".into());
    cache.put("b".into(), "2".into());
    println!("{}", cache.len());
}
