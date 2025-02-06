export interface TestTrack {
    id: string;
    title: string;
    artist: string;
    url: string;
    duration: number; // in seconds
    artwork?: string;
    genre: string;
    description: string;
    license: string;
}

export const TEST_TRACKS: TestTrack[] = [
    {
        id: "test-track-1",
        title: "Monkeys Spinning Monkeys",
        artist: "Kevin MacLeod",
        url: "/test-audio/monkeys-spinning-monkeys.mp3",
        duration: 180, // 3 minutes
        genre: "Comedy",
        description: "A playful, upbeat track perfect for light-hearted content",
        license: "Creative Commons: By Attribution 3.0",
    },
    {
        id: "test-track-2",
        title: "The Builder",
        artist: "Kevin MacLeod",
        url: "/test-audio/the-builder.mp3",
        duration: 240, // 4 minutes
        genre: "Cinematic",
        description: "An inspiring, motivational track with a building intensity",
        license: "Creative Commons: By Attribution 3.0",
    }
];

export const isTestTrackId = (id: string): boolean => {
    return id.startsWith('test-track-');
};

export const getTestTrack = (id: string): TestTrack | undefined => {
    return TEST_TRACKS.find(track => track.id === id);
};

export const getAllTestTracks = (): TestTrack[] => {
    return TEST_TRACKS;
};
