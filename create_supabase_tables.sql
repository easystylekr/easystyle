-- Create products_productcategory table
CREATE TABLE IF NOT EXISTS products_productcategory (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products_brand table
CREATE TABLE IF NOT EXISTS products_brand (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  logo_url VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products_store table
CREATE TABLE IF NOT EXISTS products_store (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  url VARCHAR(200),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products_product table
CREATE TABLE IF NOT EXISTS products_product (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  image_url VARCHAR(500),
  product_url VARCHAR(500),
  category_id INTEGER REFERENCES products_productcategory(id),
  brand_id INTEGER REFERENCES products_brand(id),
  store_id INTEGER REFERENCES products_store(id),
  ai_style_description JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (for authentication)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100),
  provider VARCHAR(20) DEFAULT 'email',
  provider_id VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products_userwishlist table
CREATE TABLE IF NOT EXISTS products_userwishlist (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products_product(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Create products_stylerecommendation table
CREATE TABLE IF NOT EXISTS products_stylerecommendation (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  style_description TEXT,
  recommended_products JSONB,
  image_analysis JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_userwishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_stylerecommendation ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own wishlist" ON products_userwishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wishlist" ON products_userwishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own wishlist" ON products_userwishlist FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommendations" ON products_stylerecommendation FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recommendations" ON products_stylerecommendation FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Public read access for products and related tables
CREATE POLICY "Anyone can view products" ON products_product FOR SELECT USING (true);
CREATE POLICY "Anyone can view categories" ON products_productcategory FOR SELECT USING (true);
CREATE POLICY "Anyone can view brands" ON products_brand FOR SELECT USING (true);
CREATE POLICY "Anyone can view stores" ON products_store FOR SELECT USING (true);

-- Insert sample data
INSERT INTO products_productcategory (name, description) VALUES
('의류', '옷, 상의, 하의 등'),
('신발', '운동화, 구두, 부츠 등'),
('악세사리', '가방, 벨트, 모자 등')
ON CONFLICT DO NOTHING;

INSERT INTO products_brand (name) VALUES
('무신사'),
('29CM'),
('스타일난다'),
('에이블리'),
('브랜디')
ON CONFLICT DO NOTHING;

INSERT INTO products_store (name, url) VALUES
('무신사', 'https://www.musinsa.com'),
('29CM', 'https://www.29cm.co.kr'),
('스타일난다', 'https://stylenanda.com'),
('에이블리', 'https://www.ably.co.kr'),
('브랜디', 'https://www.brandi.co.kr')
ON CONFLICT DO NOTHING;