import { useLoad } from "@tarojs/taro";
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";
import { isLoggedIn } from "../../utils/auth";

// Redirect entry page
export default function Index() {
	useLoad(() => {
		if (isLoggedIn()) {
			Taro.reLaunch({ url: "/pages/events/index" });
		} else {
			Taro.reLaunch({ url: "/pages/login/index" });
		}
	});

	return <View />;
}
