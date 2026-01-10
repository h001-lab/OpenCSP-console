
export interface AnnouncementAdmin {
	num: number;
	name: React.ReactNode;
	author: React.ReactNode;
	created: React.ReactNode;
	banner: React.ReactNode;
}

// info page
export interface InfoPageMessage {
	title: string;
	info: InfoItem[];
}

interface InfoItem {
	label: string;
	description: string;
}

// monitoring page
export interface MonitoringPageMessage {
	monitoring: {
		title: string;
		sub_title_1: string;
	};
}

// nodes
export interface NodesPageMessage {
	nodes: {
		title: string;
	}
}


// settings page
export interface SettingsPageMessage {
	settings: {
		title: string;
		sub_title_1: string;
		tabs: {
			tab_1: {
				title: string
			},
			tab_2: {
				title: string
			}
		};
	};
}

export interface ComponentsMessage {
	Banner: {
		linkLabel: string;
	};
}

// users page

export interface UsersPageMessage {
	users: {
		title: string;
	};
}
