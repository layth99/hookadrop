import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  RefreshControl, StatusBar, Dimensions, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard from '../../components/ui/ProductCard';
import Loader from '../../components/ui/Loader';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useProductStore } from '../../store/productStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all',        label: 'All',        icon: '🔥' },
  { id: 'hookah',     label: 'Hookahs',    icon: '🪝' },
  { id: 'shisha',     label: 'Shisha',     icon: '🌿' },
  { id: 'charcoal',   label: 'Charcoal',   icon: '⚫' },
  { id: 'accessory',  label: 'Accessories',icon: '🔧' },
  { id: 'flavors',    label: 'Flavors',    icon: '🍓' },
];

const BANNERS = [
  { id: '1', title: 'Premium Hookahs', subtitle: 'Up to 30% off', accent: colors.gold },
  { id: '2', title: 'New Flavors',     subtitle: 'Explore the collection', accent: colors.neonBlue },
  { id: '3', title: 'Free Shipping',   subtitle: 'On orders over $50', accent: colors.orange },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchText, setSearchText]         = useState('');
  const [searchFocused, setSearchFocused]   = useState(false);
  const [activeBanner, setActiveBanner]     = useState(0);
  const [refreshing, setRefreshing]         = useState(false);

  const { products, loading, fetchProducts } = useProductStore();
  const { addToCart, cartCount }             = useCartStore();
  const { toggleWishlist, isWishlisted }     = useWishlistStore();
  const { user }                             = useAuthStore();

  useEffect(() => { fetchProducts(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, []);

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === 'all' ||
      p.category?.toLowerCase().includes(activeCategory);
    const matchSearch = !searchText ||
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.mark.toLowerCase().includes(searchText.toLowerCase());
    return matchCat && matchSearch;
  });

  const featured  = filtered.filter((p) => p.discount > 0).slice(0, 6);
  const newArr    = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good evening 👋</Text>
            <Text style={styles.userName}>{user?.name || 'Explorer'}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('Wishlist')}
            >
              <Ionicons name="heart-outline" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate('Cart')}
            >
              <Ionicons name="bag-outline" size={22} color={colors.textPrimary} />
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Search bar ── */}
        <View style={[styles.searchBar, searchFocused && styles.searchFocused]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, brands..."
            placeholderTextColor={colors.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Hero Banners ── */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / (width - 40));
            setActiveBanner(idx);
          }}
          scrollEventThrottle={16}
          style={styles.bannerScroll}
          contentContainerStyle={{ paddingHorizontal: spacing.base, gap: 12 }}
        >
          {BANNERS.map((banner) => (
            <TouchableOpacity key={banner.id} activeOpacity={0.9}>
              <LinearGradient
                colors={[`${banner.accent}22`, '#111111']}
                style={[styles.banner, { width: width - 48 }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={[styles.bannerAccentBar, { backgroundColor: banner.accent }]} />
                <View style={styles.bannerContent}>
                  <Text style={[styles.bannerTitle, { color: banner.accent }]}>{banner.title}</Text>
                  <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
                  <View style={[styles.bannerBtn, { borderColor: banner.accent }]}>
                    <Text style={[styles.bannerBtnText, { color: banner.accent }]}>Shop Now</Text>
                    <Ionicons name="arrow-forward" size={14} color={banner.accent} />
                  </View>
                </View>
                <View style={styles.bannerEmoji}>
                  <Text style={{ fontSize: 64 }}>🪝</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Banner dots */}
        <View style={styles.bannerDots}>
          {BANNERS.map((_, i) => (
            <View
              key={i}
              style={[styles.bannerDot, i === activeBanner && styles.bannerDotActive]}
            />
          ))}
        </View>

        {/* ── Categories ── */}
        <SectionHeader title="Categories" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.catScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              onPress={() => setActiveCategory(cat.id)}
              activeOpacity={0.75}
            >
              <LinearGradient
                colors={activeCategory === cat.id ? ['#FFD700', '#FFA500'] : ['#1A1A1A', '#111111']}
                style={styles.catChip}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.catIcon}>{cat.icon}</Text>
                <Text style={[
                  styles.catLabel,
                  activeCategory === cat.id && { color: colors.black },
                ]}>
                  {cat.label}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── On Sale ── */}
        {featured.length > 0 && (
          <>
            <SectionHeader
              title="🔥 On Sale"
              onSeeAll={() => navigation.navigate('Products', { filter: 'sale' })}
            />
            <FlatList
              data={featured}
              horizontal
              keyExtractor={(item) => item._id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  style={{ width: 165, marginRight: 12 }}
                  onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                  onWishlist={() => toggleWishlist(item)}
                  isWishlisted={isWishlisted(item._id)}
                />
              )}
            />
          </>
        )}

        {/* ── New Arrivals ── */}
        <SectionHeader
          title="✨ New Arrivals"
          onSeeAll={() => navigation.navigate('Products', { filter: 'new' })}
        />
        {loading ? (
          <Loader />
        ) : (
          <FlatList
            data={newArr.length > 0 ? newArr : filtered.slice(0, 6)}
            horizontal
            keyExtractor={(item) => item._id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                style={{ width: 165, marginRight: 12 }}
                onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
                onWishlist={() => toggleWishlist(item)}
                isWishlisted={isWishlisted(item._id)}
              />
            )}
          />
        )}

        {/* ── All Products grid ── */}
        <SectionHeader
          title="All Products"
          onSeeAll={() => navigation.navigate('Products')}
        />
        <View style={styles.grid}>
          {filtered.slice(0, 4).map((item) => (
            <ProductCard
              key={item._id}
              product={item}
              style={{ width: (width - spacing.base * 2 - 10) / 2 }}
              onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
              onWishlist={() => toggleWishlist(item)}
              isWishlisted={isWishlisted(item._id)}
            />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, onSeeAll }) {
  return (
    <View style={secStyles.row}>
      <Text style={secStyles.title}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={secStyles.seeAll}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  title: { color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  seeAll: { color: colors.gold, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  greeting: { color: colors.textMuted, fontSize: fontSize.sm },
  userName: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  headerRight: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: colors.black, fontSize: 9, fontWeight: fontWeight.bold },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCardLight,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    marginHorizontal: spacing.base,
    height: 46,
    marginBottom: spacing.base,
  },
  searchFocused: { borderColor: colors.gold },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: fontSize.base },
  bannerScroll: { marginBottom: spacing.sm },
  banner: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    height: 140,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  bannerAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radius.xl,
    borderBottomLeftRadius: radius.xl,
  },
  bannerContent: { flex: 1, paddingLeft: spacing.md },
  bannerTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.black, marginBottom: 4 },
  bannerSubtitle: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.md },
  bannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    gap: 4,
  },
  bannerBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  bannerEmoji: { position: 'absolute', right: 16, opacity: 0.15 },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.xs,
  },
  bannerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  bannerDotActive: { width: 18, backgroundColor: colors.gold },
  catScroll: { paddingHorizontal: spacing.base, gap: 8, paddingBottom: 4 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catIcon: { fontSize: 16 },
  catLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  hList: { paddingHorizontal: spacing.base },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.base,
    gap: 10,
  },
});
