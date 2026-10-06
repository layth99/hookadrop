import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, StatusBar, Dimensions, TextInput, Modal, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ProductCard from '../../components/ui/ProductCard';
import Loader from '../../components/ui/Loader';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { useProductStore } from '../../store/productStore';
import { useWishlistStore } from '../../store/wishlistStore';

const { width } = Dimensions.get('window');
const CARD_W = (width - spacing.base * 2 - 10) / 2;

const SORT_OPTIONS = [
  { id: 'newest',    label: 'Newest First' },
  { id: 'oldest',    label: 'Oldest First' },
  { id: 'price_asc', label: 'Price: Low → High' },
  { id: 'price_desc',label: 'Price: High → Low' },
  { id: 'discount',  label: 'On Sale' },
];

const CATEGORIES = ['All', 'Hookah', 'Shisha', 'Charcoal', 'Accessory', 'Flavors'];

export default function ProductsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initFilter = route?.params?.filter || 'all';

  const { products, loading, fetchProducts } = useProductStore();
  const { toggleWishlist, isWishlisted }      = useWishlistStore();

  const [search, setSearch]         = useState('');
  const [activeCategory, setCategory] = useState('All');
  const [sortBy, setSortBy]         = useState('newest');
  const [showFilter, setShowFilter] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [maxPrice, setMaxPrice]     = useState(9999);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => {
    if (initFilter === 'sale') setSortBy('discount');
  }, [initFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  }, []);

  const filtered = products
    .filter((p) => {
      const matchCat = activeCategory === 'All' ||
        p.category?.toLowerCase().includes(activeCategory.toLowerCase());
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.mark.toLowerCase().includes(search.toLowerCase());
      const matchPrice = p.price <= maxPrice;
      return matchCat && matchSearch && matchPrice;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':  return a.price - b.price;
        case 'price_desc': return b.price - a.price;
        case 'discount':   return (b.discount || 0) - (a.discount || 0);
        case 'oldest':     return new Date(a.createdAt) - new Date(b.createdAt);
        default:           return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

  const renderProduct = ({ item }) => (
    <ProductCard
      product={item}
      style={{ width: CARD_W }}
      onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
      onWishlist={() => toggleWishlist(item)}
      isWishlisted={isWishlisted(item._id)}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity onPress={() => setShowFilter(true)} style={styles.filterBtn}>
          <Ionicons name="options-outline" size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat} onPress={() => setCategory(cat)} activeOpacity={0.8}>
            <LinearGradient
              colors={activeCategory === cat ? ['#FFD700', '#FFA500'] : ['#1A1A1A', '#111111']}
              style={styles.catChip}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.catLabel, activeCategory === cat && { color: colors.black }]}>
                {cat}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count + sort label */}
      <View style={styles.meta}>
        <Text style={styles.resultCount}>{filtered.length} products</Text>
        <TouchableOpacity
          onPress={() => setShowFilter(true)}
          style={styles.sortLabel}
        >
          <Ionicons name="swap-vertical-outline" size={14} color={colors.gold} />
          <Text style={styles.sortText}>
            {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Grid */}
      {loading ? (
        <Loader />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={renderProduct}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          }
        />
      )}

      {/* Filter modal */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowFilter(false)} />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Sort & Filter</Text>

          <Text style={styles.sheetSectionTitle}>Sort By</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={styles.sortOption}
              onPress={() => { setSortBy(opt.id); setShowFilter(false); }}
            >
              <Text style={[styles.sortOptionText, sortBy === opt.id && styles.sortOptionActive]}>
                {opt.label}
              </Text>
              {sortBy === opt.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.gold} />
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.closeSheet}
            onPress={() => setShowFilter(false)}
          >
            <Text style={styles.closeSheetText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.md,
  },
  title: { flex: 1, color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  filterBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgCardLight,
    borderWidth: 1, borderColor: colors.borderGold,
    alignItems: 'center', justifyContent: 'center',
  },
  searchRow: { paddingHorizontal: spacing.base, marginBottom: spacing.md },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCardLight,
    borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.base, height: 44,
  },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: fontSize.base },
  catRow: { paddingHorizontal: spacing.base, gap: 8, paddingBottom: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.base, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  catLabel: { color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  meta: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.base, marginVertical: spacing.sm,
  },
  resultCount: { color: colors.textMuted, fontSize: fontSize.sm },
  sortLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortText: { color: colors.gold, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100 },
  row: { gap: 10, marginBottom: 10 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: colors.textMuted, fontSize: fontSize.base },
  // Filter sheet
  overlay: { flex: 1, backgroundColor: colors.overlay },
  filterSheet: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, paddingBottom: 48,
    borderTopWidth: 1, borderColor: colors.border,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: {
    color: colors.textPrimary, fontSize: fontSize.xl,
    fontWeight: fontWeight.bold, marginBottom: spacing.xl,
  },
  sheetSectionTitle: {
    color: colors.gold, fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold, letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: spacing.md,
  },
  sortOption: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  sortOptionText: { color: colors.textSecondary, fontSize: fontSize.base },
  sortOptionActive: { color: colors.gold, fontWeight: fontWeight.semibold },
  closeSheet: {
    marginTop: spacing.xl, backgroundColor: colors.gold,
    borderRadius: radius.full, paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeSheetText: { color: colors.black, fontWeight: fontWeight.bold, fontSize: fontSize.base },
});
