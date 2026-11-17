package com.arcanaguide.app;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

@CapacitorPlugin(name = "PlayBilling")
public class PlayBillingPlugin extends Plugin {
    private static final String PRODUCT_ID = "arcana_premium_lifetime";
    private static final String STORE_UNAVAILABLE = "Google Play Billing is unavailable on this device.";
    private final List<Consumer<Boolean>> waitingForConnection = new ArrayList<>();
    private BillingClient client;
    private boolean connectedOnce;

    @Override
    public void load() {
        client = BillingClient.newBuilder(getContext())
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .setListener(this::purchaseUpdated)
            .build();
    }

    private void withBilling(PluginCall call, Runnable action) {
        getActivity().runOnUiThread(() -> {
            if (connectedOnce) {
                action.run();
                return;
            }
            waitingForConnection.add(connected -> {
                if (connected) action.run();
                else call.reject(STORE_UNAVAILABLE);
            });
            if (waitingForConnection.size() > 1) return;
            client.startConnection(new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(BillingResult result) {
                    getActivity().runOnUiThread(() -> {
                        connectedOnce = result.getResponseCode() == BillingClient.BillingResponseCode.OK;
                        List<Consumer<Boolean>> waiting = new ArrayList<>(waitingForConnection);
                        waitingForConnection.clear();
                        for (Consumer<Boolean> callback : waiting) callback.accept(connectedOnce);
                    });
                }

                @Override
                public void onBillingServiceDisconnected() {
                    // BillingClient reconnects on the next API request.
                }
            });
        });
    }

    @PluginMethod
    public void getOwnership(PluginCall call) {
        QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP).build();
        withBilling(call, () -> client.queryPurchasesAsync(params, (result, purchases) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(STORE_UNAVAILABLE);
                return;
            }
            call.resolve(ownership(purchases));
        }));
    }

    @PluginMethod
    public void getOffer(PluginCall call) {
        queryOffer(call, (product, offer) -> {
            JSObject result = new JSObject();
            if (offer != null) result.put("price", offer.getFormattedPrice());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void buy(PluginCall call) {
        String displayedPrice = call.getString("price", "");
        queryOffer(call, (product, offer) -> {
            if (offer == null) {
                call.resolve(result("unavailable"));
                return;
            }
            if (!offer.getFormattedPrice().equals(displayedPrice)) {
                JSObject changed = result("price_changed");
                changed.put("price", offer.getFormattedPrice());
                call.resolve(changed);
                return;
            }
            BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(product)
                .setOfferToken(offer.getOfferToken())
                .build();
            BillingFlowParams params = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(Collections.singletonList(item))
                .build();
            getActivity().runOnUiThread(() -> {
                int code = client.launchBillingFlow(getActivity(), params).getResponseCode();
                call.resolve(result(code == BillingClient.BillingResponseCode.OK ? "launched" : status(code)));
            });
        });
    }

    private void queryOffer(PluginCall call, BiConsumer<ProductDetails, ProductDetails.OneTimePurchaseOfferDetails> callback) {
        QueryProductDetailsParams.Product item = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(PRODUCT_ID).setProductType(BillingClient.ProductType.INAPP).build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(item)).build();
        withBilling(call, () -> client.queryProductDetailsAsync(params, (result, details) -> {
            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                call.reject(STORE_UNAVAILABLE);
                return;
            }
            for (ProductDetails product : details.getProductDetailsList()) {
                List<ProductDetails.OneTimePurchaseOfferDetails> offers = product.getOneTimePurchaseOfferDetailsList();
                if (!PRODUCT_ID.equals(product.getProductId()) || offers == null) continue;
                for (ProductDetails.OneTimePurchaseOfferDetails offer : offers) {
                    if (offer.getRentalDetails() == null && offer.getPreorderDetails() == null) {
                        callback.accept(product, offer);
                        return;
                    }
                }
            }
            callback.accept(null, null);
        }));
    }

    private void purchaseUpdated(BillingResult billingResult, List<Purchase> purchases) {
        int code = billingResult.getResponseCode();
        JSObject data = code == BillingClient.BillingResponseCode.OK ? ownership(purchases) : new JSObject();
        data.put("result", code == BillingClient.BillingResponseCode.OK ? "updated" : status(code));
        notifyListeners("purchaseResult", data, true);
    }

    private static JSObject ownership(List<Purchase> purchases) {
        JSObject data = new JSObject();
        boolean pending = false;
        if (purchases != null) {
            for (Purchase purchase : purchases) {
                if (!purchase.getProducts().contains(PRODUCT_ID)) continue;
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                    data.put("purchaseToken", purchase.getPurchaseToken());
                }
                if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) pending = true;
            }
        }
        data.put("pending", pending);
        return data;
    }

    private static JSObject result(String status) {
        JSObject data = new JSObject();
        data.put("result", status);
        return data;
    }

    private static String status(int code) {
        return switch (code) {
            case BillingClient.BillingResponseCode.USER_CANCELED -> "cancelled";
            case BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> "owned";
            default -> "unavailable";
        };
    }

    @Override
    protected void handleOnDestroy() {
        client.endConnection();
    }
}
