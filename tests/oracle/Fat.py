import mmap
import shutil
import struct


def write_files(source, destination, files):
    """Put 8.3 oracle fixtures in a private copy of the pinned FAT32 disk."""
    shutil.copyfile(source, destination)
    with open(destination, "r+b") as stream, mmap.mmap(stream.fileno(), 0) as disk:
        def read16(offset):
            return struct.unpack_from("<H", disk, offset)[0]

        def read32(offset):
            return struct.unpack_from("<I", disk, offset)[0]

        start = read32(446 + 8) * 512
        sector = read16(start + 11)
        cluster_size = disk[start + 13] * sector
        reserved = read16(start + 14)
        fats = disk[start + 16]
        fat_size = read32(start + 36) * sector
        root = read32(start + 44)
        fat = start + reserved * sector
        data = fat + fats * fat_size
        if sector != 512 or cluster_size < 512 or fats != 2:
            raise ValueError("The oracle needs the FAT32 disk in Manifest.json")

        def position(cluster):
            return data + (cluster - 2) * cluster_size

        def next_cluster(cluster):
            return read32(fat + cluster * 4) & 0xFFFFFFF

        def set_cluster(cluster, value):
            for index in range(fats):
                struct.pack_into("<I", disk, fat + index * fat_size + cluster * 4, value)

        free = [cluster for cluster in range(2, fat_size // 4)
                if next_cluster(cluster) == 0]
        used = 0

        def allocate(count):
            nonlocal used
            chain = free[used:used + count]
            used += count
            if len(chain) != count:
                raise ValueError("Oracle disk is full")
            for index, cluster in enumerate(chain):
                set_cluster(cluster, chain[index + 1] if index + 1 < count else 0xFFFFFFF)
                offset = position(cluster)
                disk[offset:offset + cluster_size] = bytes(cluster_size)
            return chain

        def entry(name, attributes, cluster, size):
            if name in (".", ".."):
                short_name = name.ljust(11)
            else:
                stem, _, extension = name.partition(".")
                if len(stem) > 8 or len(extension) > 3 or name != name.upper():
                    raise ValueError("Expected an upper-case 8.3 file name: " + name)
                short_name = stem.ljust(8) + extension.ljust(3)
            item = bytearray(32)
            item[:11] = short_name.encode("ascii")
            item[11] = attributes
            struct.pack_into("<H", item, 20, cluster >> 16)
            struct.pack_into("<H", item, 26, cluster & 65535)
            struct.pack_into("<I", item, 28, size)
            return item

        directories = allocate(((len(files) + 3) * 32 + cluster_size - 1) // cluster_size)

        def directory_entry(index, item):
            offset = index * 32
            address = position(directories[offset // cluster_size]) + offset % cluster_size
            disk[address:address + 32] = item

        directory_entry(0, entry(".", 0x10, directories[0], 0))
        directory_entry(1, entry("..", 0x10, root, 0))
        for index, (name, contents) in enumerate(files.items()):
            chain = allocate(max(1, (len(contents) + cluster_size - 1) // cluster_size))
            for number, cluster in enumerate(chain):
                part = contents[number * cluster_size:(number + 1) * cluster_size]
                disk[position(cluster):position(cluster) + len(part)] = part
            directory_entry(index + 2, entry(name, 0x20, chain[0], len(contents)))

        cluster = root
        while True:
            for offset in range(0, cluster_size, 32):
                address = position(cluster) + offset
                if disk[address:address + 11] == b"ORACLE     ":
                    raise ValueError("The baseline disk already contains ORACLE")
                if disk[address] in (0, 0xE5):
                    disk[address:address + 32] = entry("ORACLE", 0x10, directories[0], 0)
                    disk.flush()
                    return
            cluster = next_cluster(cluster)
            if cluster >= 0xFFFFFF8:
                raise ValueError("The baseline disk's root directory has no free slot")
