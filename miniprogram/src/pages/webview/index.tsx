import { View, Text, WebView } from "@tarojs/components";
import { useLoad, useRouter } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import "./index.scss";

export default function WebviewPage() {
	const router = useRouter();
	const rawUrl = String(router.params.url || "");
	const title = String(router.params.title || "");

	useLoad(() => {
		if (title) {
			Taro.setNavigationBarTitle({ title });
		}
	});

	let url = rawUrl.replace(/`/g, "").trim();
	try {
		if (/%[0-9a-fA-F]{2}/.test(url)) {
			url = decodeURIComponent(url);
		}
	} catch {}

	if (!/^https?:\/\//i.test(url)) {
		return (
			<View className="webview-fallback">
				<Text className="webview-fallback-text">链接无效</Text>
			</View>
		);
	}

	return <WebView src={url} />;
}
