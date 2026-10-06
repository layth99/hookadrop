import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductCard from '../../components/ui/ProductCard';
import Button from '../../components/ui/Button';
import { colors } from '../../theme/colors';
import { fontSize, fontWeight } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useWishlistStore } from '../../store/wishlistStore';

const { width } = Dimensions.get('window');
const CARD_W = (width - spacing.base * 2 - 10) / 2;

export default function WishlistScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { wishlist, toggleWishlist, isWishlisted } = useWishlistStore();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Wishlist</Text>
        <Text style={styles.count}>{wishlist.length} items</Text>
      </View>

      {wishlist.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="heart-outline" size={72} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptySubtitle}>Tap the heart on any product to save it here</Text>
          <Button
            title="Browse Products"
            onPress={() => navigation.navigate('Products')}
            style={{ marginTop: spacing.xl }}
          />
        </View>
      ) : (
        <FlatList
          data={wishlist}
          keyExtractor={(item) => item._id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              style={{ width: CARD_W }}
              onPress={() => navigation.navigate('ProductDetail', { productId: item._id })}
              onWishlist={() => toggleWishlist(item)}
              isWishlisted={isWishlisted(item._id)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.bgCardLight, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  title: { flex: 1, color: colors.textPrimary, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  count: { color: colors.textMuted, fontSize: fontSize.sm },
  list: { padding: spacing.base, paddingBottom: 100 },
  row: { gap: 10, marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: spacing.base },
  emptyTitle: { color: colors.textPrimary, fontSize: fontSize.xl, fontWeight: fontWeight.bold },
  emptySubtitle: { color: colors.textMuted, fontSize: fontSize.base, textAlign: 'center' },
});
