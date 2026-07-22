import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { tokens } from "@miro/ui";
import {
  deleteGalleryAsset,
  listGalleryAssets,
  type MobileGalleryAsset,
} from "../src/lib/gallery";

export default function GalleryScreen(): ReactElement {
  const [assets, setAssets] = useState<readonly MobileGalleryAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      setAssets(await listGalleryAssets());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleDelete(assetId: string): Promise<void> {
    await deleteGalleryAsset(assetId);
    await refresh();
  }

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={tokens.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={assets}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No images yet</Text>
              <Text style={styles.emptySubtitle}>
                Switch to Image mode in chat and generate something — it will appear here
                (AsyncStorage on this device).
              </Text>
            </View>
          }
          ListHeaderComponent={
            <Text style={styles.hint}>
              Stored on device only (not the desktop encrypted vault). Cap: 40 images.
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.dataUrl }} style={styles.image} resizeMode="cover" />
              <Text style={styles.prompt} numberOfLines={2}>
                {item.prompt || "Generated image"}
              </Text>
              <Pressable onPress={() => void handleDelete(item.id)}>
                <Text style={styles.delete}>Delete</Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 12,
    gap: 12,
    flexGrow: 1,
  },
  row: {
    gap: 12,
  },
  hint: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 8,
    lineHeight: 18,
  },
  empty: {
    paddingVertical: 48,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#e5e7eb",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    overflow: "hidden",
    backgroundColor: "#020617",
    marginBottom: 12,
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#0f172a",
  },
  prompt: {
    paddingHorizontal: 10,
    paddingTop: 8,
    fontSize: 12,
    color: "#94a3b8",
    lineHeight: 16,
  },
  delete: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: "600",
    color: "#f87171",
  },
});
